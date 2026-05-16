package com.ekhuaheng.goldshop.service;

import com.ekhuaheng.goldshop.dto.PawnTicketRequest;
import com.ekhuaheng.goldshop.dto.ProductRequest;
import com.ekhuaheng.goldshop.config.GoldShopProperties;
import com.ekhuaheng.goldshop.config.SheetNames;
import com.ekhuaheng.goldshop.entity.*;
import com.ekhuaheng.goldshop.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PawnService {

    private final PawnTicketRepository pawnTicketRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final PawnHistoryRepository pawnHistoryRepository;
    private final GoogleSheetsService sheetsService;
    private final DocumentNumberService documentNumberService;
    private final GoldCalculationService goldCalculationService;
    private final ProductService productService;
    private final GoldShopProperties properties;
    private final AuditLogService auditLogService;

    @Transactional
    public PawnTicket createTicket(PawnTicketRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้งานในระบบ"));

        // 1. ค้นหาหรือสร้างข้อมูลลูกค้า
        Customer customer;
        if (request.getCustomerId() != null && request.getCustomerId() > 0) {
            customer = customerRepository.findById(request.getCustomerId())
                    .orElseThrow(() -> new RuntimeException("ไม่พบลูกค้า ID: " + request.getCustomerId()));
        } else {
            // ค้นหาจากเลขบัตร หรือ ชื่อ
            Optional<Customer> existing = Optional.empty();
            if (request.getIdCard() != null && !request.getIdCard().isEmpty()) {
                existing = customerRepository.findByIdCardNumber(request.getIdCard());
            }
            if (existing.isEmpty() && request.getCustomerName() != null) {
                existing = customerRepository.findByFullName(request.getCustomerName());
            }

            if (existing.isPresent()) {
                customer = existing.get();
            } else {
                // สร้างลูกค้าใหม่
                customer = Customer.builder()
                        .fullName(request.getCustomerName())
                        .phoneNumber(request.getCustomerPhone())
                        .idCardNumber(request.getIdCard())
                        .address("-")
                        .build();
                customer = customerRepository.save(customer);
                
                // Sync ลูกค้าใหม่ไป Google Sheets
                try {
                    sheetsService.insertData(SheetNames.CUSTOMERS, Map.of(
                        "id", customer.getId(),
                        "fullName", customer.getFullName(),
                        "phone", customer.getPhoneNumber() != null ? customer.getPhoneNumber() : "-",
                        "idCard", customer.getIdCardNumber() != null ? customer.getIdCardNumber() : "-"
                    ));
                } catch (Exception e) {
                    log.error("Failed to sync new customer to Sheets: {}", e.getMessage());
                }
            }
        }

        Product product;
        if (request.getProductId() != null) {
            product = productRepository.findById(request.getProductId())
                    .orElseThrow(() -> new RuntimeException("ไม่พบสินค้า ID: " + request.getProductId()));
        } else {
            ProductRequest productRequest = new ProductRequest();
            productRequest.setName(request.getProductName());
            productRequest.setCategory(request.getCategory());
            productRequest.setWeightGram(request.getWeightGram() == null ? 0.0 : request.getWeightGram());
            productRequest.setWeightText(request.getWeightText());
            productRequest.setStatus(ProductStatus.AVAILABLE);
            product = productService.createProduct(productRequest);
        }

        if (product.getStatus() != ProductStatus.AVAILABLE) {
            throw new RuntimeException("สินค้า " + product.getName() + " ไม่สามารถจำนำได้ (สถานะ: " + product.getStatus() + ")");
        }

        PawnTicket ticket = PawnTicket.builder()
                .ticketNumber(documentNumberService.pawnTicketNumber())
                .customer(customer)
                .product(product)
                .principalAmount(request.getPrincipalAmount())
                .interestRate(request.getInterestRate() == null ? calculateInterestRate(request.getPrincipalAmount()) : request.getInterestRate())
                .pawnDate(request.getPawnDate() != null ? request.getPawnDate() : LocalDate.now())
                .dueDate(request.getDueDate() != null ? request.getDueDate() : LocalDate.now().plusMonths(properties.getBusiness().getPawn().getDefaultTermMonths()))
                .status(PawnStatus.ACTIVE)
                .createdBy(user)
                .build();

        // Update product status
        product.setStatus(ProductStatus.PAWNED);
        productRepository.save(product);

        PawnTicket savedTicket = pawnTicketRepository.save(ticket);
        
        // Log history
        PawnHistory history = PawnHistory.builder()
                .pawnTicket(savedTicket)
                .actionType(PawnActionType.CREATE)
                .amountPaid(0.0)
                .interestPaid(0.0)
                .principalAdjusted(savedTicket.getPrincipalAmount())
                .previousDueDate(null)
                .newDueDate(savedTicket.getDueDate())
                .createdBy(user)
                .build();
        PawnHistory savedHistory = pawnHistoryRepository.save(history);

        // Sync to Google Sheets
        try {
            sheetsService.insertData(SheetNames.PAWN_TICKETS, Map.of(
                "id", savedTicket.getId(),
                "customer", savedTicket.getCustomer().getFullName(),
                "product", savedTicket.getProduct().getName(),
                "principal", savedTicket.getPrincipalAmount(),
                "interestRate", savedTicket.getInterestRate(),
                "pawnDate", savedTicket.getPawnDate().toString(),
                "dueDate", savedTicket.getDueDate().toString(),
                "status", savedTicket.getStatus()
            ));
            
            sheetsService.insertData(SheetNames.PAWN_HISTORY, Map.of(
                "id", savedHistory.getId(),
                "ticketId", savedTicket.getId(),
                "actionType", PawnActionType.CREATE.name(),
                "amountPaid", 0.0,
                "interestPaid", 0.0,
                "createdAt", LocalDate.now().toString()
            ));
        } catch (Exception e) {
            log.error("Failed to sync to Google Sheets: {}", e.getMessage());
        }

        auditLogService.record("CREATE_PAWN_TICKET", "PawnTicket", savedTicket.getId(), savedTicket.getTicketNumber());
        return savedTicket;
    }

    public List<PawnTicket> getAllTickets() {
        return pawnTicketRepository.findAll();
    }

    @Transactional
    public PawnTicket redeemTicket(Long ticketId) {
        com.ekhuaheng.goldshop.dto.PawnActionRequest request = new com.ekhuaheng.goldshop.dto.PawnActionRequest();
        request.setActionType(PawnActionType.REDEEM);
        request.setAmountPaid(0.0);
        request.setInterestPaid(0.0);
        return performAction(ticketId, request);
    }

    @Transactional
    public PawnTicket performAction(Long ticketId, com.ekhuaheng.goldshop.dto.PawnActionRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้งานในระบบ"));

        PawnTicket ticket = pawnTicketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("ไม่พบตั๋วจำนำ ID: " + ticketId));

        if (ticket.getStatus() != PawnStatus.ACTIVE) {
            throw new RuntimeException("ตั๋วนี้ไม่อยู่ในสถานะที่ทำรายการได้");
        }

        LocalDate oldDueDate = ticket.getDueDate();
        LocalDate newDueDate = oldDueDate;

        PawnHistory.PawnHistoryBuilder historyBuilder = PawnHistory.builder()
                .pawnTicket(ticket)
                .actionType(request.getActionType())
                .amountPaid(request.getAmountPaid() != null ? request.getAmountPaid() : 0.0)
                .interestPaid(request.getInterestPaid() != null ? request.getInterestPaid() : 0.0)
                .previousDueDate(oldDueDate)
                .createdBy(user);

        if (request.getActionType() == PawnActionType.RENEW) {
            if (request.getExtendMonths() == null || request.getExtendMonths() <= 0) {
                throw new RuntimeException("กรุณาระบุจำนวนเดือนที่ต้องการต่อดอกเบี้ย");
            }
            newDueDate = oldDueDate.plusMonths(request.getExtendMonths());
            ticket.setDueDate(newDueDate);
            if (request.getNewInterestRate() != null) {
                ticket.setInterestRate(request.getNewInterestRate());
            }
            historyBuilder.principalAdjusted(0.0);

        } else if (request.getActionType() == PawnActionType.ADJUST_PRINCIPAL) {
            Double adjustAmount = request.getPrincipalAdjusted();
            if (adjustAmount == null || adjustAmount == 0) {
                throw new RuntimeException("กรุณาระบุยอดเงินที่ต้องการเพิ่มหรือลด");
            }
            double newPrincipal = ticket.getPrincipalAmount() + adjustAmount;
            if (newPrincipal <= 0) {
                throw new RuntimeException("ยอดเงินต้นใหม่ต้องมากกว่า 0 (หากต้องการไถ่ถอน กรุณาใช้เมนูไถ่ถอน)");
            }
            ticket.setPrincipalAmount(newPrincipal);
            // Update interest rate based on new principal
            ticket.setInterestRate(calculateInterestRate(newPrincipal));
            historyBuilder.principalAdjusted(adjustAmount);

        } else if (request.getActionType() == PawnActionType.REDEEM) {
            ticket.setStatus(PawnStatus.REDEEMED);
            Product product = ticket.getProduct();
            product.setStatus(ProductStatus.AVAILABLE);
            productRepository.save(product);
            historyBuilder.principalAdjusted(-ticket.getPrincipalAmount());
        } else {
            throw new RuntimeException("ประเภทการทำรายการไม่ถูกต้อง");
        }

        historyBuilder.newDueDate(newDueDate);
        PawnTicket savedTicket = pawnTicketRepository.save(ticket);
        PawnHistory savedHistory = pawnHistoryRepository.save(historyBuilder.build());

        // Sync action to Google Sheets
        try {
            sheetsService.insertData(SheetNames.PAWN_HISTORY, Map.of(
                "id", savedHistory.getId(),
                "ticketId", savedTicket.getId(),
                "actionType", request.getActionType().name(),
                "amountPaid", request.getAmountPaid() != null ? request.getAmountPaid() : 0.0,
                "interestPaid", request.getInterestPaid() != null ? request.getInterestPaid() : 0.0,
                "createdAt", LocalDate.now().toString()
            ));
        } catch (Exception e) {
            log.error("Failed to sync history to Google Sheets: {}", e.getMessage());
        }

        auditLogService.record("PAWN_ACTION", "PawnTicket", savedTicket.getId(), request.getActionType().name());
        return savedTicket;
    }

    public double calculateInterestRate(double principal) {
        return goldCalculationService.pawnInterestRate(java.math.BigDecimal.valueOf(principal)).doubleValue();
    }

    public Map<String, Object> getSuggestedInterest(Long ticketId) {
        PawnTicket ticket = pawnTicketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("ไม่พบตั๋วจำนำ"));
        
        PawnHistory lastAction = pawnHistoryRepository.findByPawnTicketIdOrderByCreatedAtDesc(ticketId).stream()
                .filter(h -> h.getActionType() == PawnActionType.RENEW || h.getActionType() == PawnActionType.CREATE)
                .findFirst()
                .orElse(null);

        LocalDate startDate = (lastAction != null) ? lastAction.getCreatedAt().toLocalDate() : ticket.getPawnDate();
        LocalDate today = LocalDate.now();
        
        // 1. Redeem Rule (1-15 = 0.5, 16+ = 1.0)
        double redeemMonths = 0;
        if (startDate.getYear() == today.getYear() && startDate.getMonthValue() == today.getMonthValue()) {
            redeemMonths = (today.getDayOfMonth() <= 15) ? 0.5 : 1.0;
        } else {
            redeemMonths += (startDate.getDayOfMonth() <= 15) ? 0.5 : 1.0;
            LocalDate midDate = startDate.plusMonths(1).withDayOfMonth(1);
            while (midDate.isBefore(today.withDayOfMonth(1))) {
                redeemMonths += 1.0;
                midDate = midDate.plusMonths(1);
            }
            redeemMonths += (today.getDayOfMonth() <= 15) ? 0.5 : 1.0;
        }

        // 2. Renew Rule (Match dates)
        long fullMonths = ChronoUnit.MONTHS.between(startDate, today);
        double renewMonths = fullMonths + (today.getDayOfMonth() > startDate.getDayOfMonth() ? 0.5 : 0.0);
        if (renewMonths <= 0) renewMonths = 0.5;

        double principal = ticket.getPrincipalAmount();
        double ratePercent = calculateInterestRate(principal) / 100.0;
        GoldShopProperties.Business.Pawn pawnRules = properties.getBusiness().getPawn();
        double reduction = (java.math.BigDecimal.valueOf(principal).compareTo(pawnRules.getMiddleTicketMin()) >= 0
                && java.math.BigDecimal.valueOf(principal).compareTo(pawnRules.getSmallTicketLimit()) <= 0)
                ? pawnRules.getMonthlyReductionForMiddleTickets().doubleValue()
                : 0.0;
        
        // We will return both, frontend will pick based on active tab
        double redeemInterest = (principal * ratePercent * redeemMonths) - (reduction * redeemMonths);
        double renewInterest = (principal * ratePercent * renewMonths) - (reduction * renewMonths);

        return Map.of(
            "principal", principal,
            "startDate", startDate,
            "redeemMonths", redeemMonths,
            "renewMonths", renewMonths,
            "redeemInterest", Math.max(0, redeemInterest),
            "renewInterest", Math.max(0, renewInterest),
            "rate", ratePercent * 100,
            "reduction", reduction
        );
    }

    public List<PawnHistory> getTicketHistory(Long ticketId) {
        return pawnHistoryRepository.findByPawnTicketIdOrderByCreatedAtDesc(ticketId);
    }

    public Map<String, Object> getDashboardSummary() {
        LocalDate today = LocalDate.now();
        LocalDate nextWeek = today.plusDays(7);

        List<PawnTicket> activeTickets = pawnTicketRepository.findAll().stream()
                .filter(t -> t.getStatus() == PawnStatus.ACTIVE)
                .collect(Collectors.toList());

        long nearDueCount = activeTickets.stream()
                .filter(t -> t.getDueDate().isBefore(nextWeek))
                .count();

        double totalPrincipal = activeTickets.stream()
                .mapToDouble(PawnTicket::getPrincipalAmount)
                .sum();

        return Map.of(
            "activeCount", activeTickets.size(),
            "nearDueCount", nearDueCount,
            "totalPrincipal", totalPrincipal
        );
    }
}
