package com.ekhuaheng.goldshop.service;

import com.ekhuaheng.goldshop.dto.PawnTicketRequest;
import com.ekhuaheng.goldshop.entity.*;
import com.ekhuaheng.goldshop.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PawnService {

    private final PawnTicketRepository pawnTicketRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final PawnHistoryRepository pawnHistoryRepository;

    @Transactional
    public PawnTicket createTicket(PawnTicketRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้งานในระบบ"));

        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new RuntimeException("ไม่พบลูกค้า ID: " + request.getCustomerId()));

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new RuntimeException("ไม่พบสินค้า ID: " + request.getProductId()));

        if (!"AVAILABLE".equals(product.getStatus())) {
            throw new RuntimeException("สินค้า " + product.getName() + " ไม่สามารถจำนำได้ (สถานะ: " + product.getStatus() + ")");
        }

        PawnTicket ticket = PawnTicket.builder()
                .customer(customer)
                .product(product)
                .principalAmount(request.getPrincipalAmount())
                .interestRate(calculateInterestRate(request.getPrincipalAmount()))
                .pawnDate(request.getPawnDate() != null ? request.getPawnDate() : LocalDate.now())
                .dueDate(request.getDueDate())
                .status("ACTIVE")
                .createdBy(user)
                .build();

        // Update product status
        product.setStatus("PAWNED");
        productRepository.save(product);

        PawnTicket savedTicket = pawnTicketRepository.save(ticket);
        
        // Log history
        PawnHistory history = PawnHistory.builder()
                .pawnTicket(savedTicket)
                .actionType("CREATE")
                .amountPaid(0.0)
                .interestPaid(0.0)
                .principalAdjusted(savedTicket.getPrincipalAmount())
                .previousDueDate(null)
                .newDueDate(savedTicket.getDueDate())
                .createdBy(user)
                .build();
        pawnHistoryRepository.save(history);

        return savedTicket;
    }

    public List<PawnTicket> getAllTickets() {
        return pawnTicketRepository.findAll();
    }

    @Transactional
    public PawnTicket redeemTicket(Long ticketId) {
        // Legacy redeem without payment tracking, replaced by performAction
        return performAction(ticketId, new com.ekhuaheng.goldshop.dto.PawnActionRequest() {{
            setActionType("REDEEM");
            setAmountPaid(0.0);
            setInterestPaid(0.0);
        }});
    }

    @Transactional
    public PawnTicket performAction(Long ticketId, com.ekhuaheng.goldshop.dto.PawnActionRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้งานในระบบ"));

        PawnTicket ticket = pawnTicketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("ไม่พบตั๋วจำนำ ID: " + ticketId));

        if (!"ACTIVE".equals(ticket.getStatus())) {
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

        if ("RENEW".equals(request.getActionType())) {
            if (request.getExtendMonths() == null || request.getExtendMonths() <= 0) {
                throw new RuntimeException("กรุณาระบุจำนวนเดือนที่ต้องการต่อดอกเบี้ย");
            }
            newDueDate = oldDueDate.plusMonths(request.getExtendMonths());
            ticket.setDueDate(newDueDate);
            if (request.getNewInterestRate() != null) {
                ticket.setInterestRate(request.getNewInterestRate());
            }
            historyBuilder.principalAdjusted(0.0);

        } else if ("ADJUST_PRINCIPAL".equals(request.getActionType())) {
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

        } else if ("REDEEM".equals(request.getActionType())) {
            ticket.setStatus("REDEEMED");
            Product product = ticket.getProduct();
            product.setStatus("AVAILABLE");
            productRepository.save(product);
            historyBuilder.principalAdjusted(-ticket.getPrincipalAmount());
        } else {
            throw new RuntimeException("ประเภทการทำรายการไม่ถูกต้อง");
        }

        historyBuilder.newDueDate(newDueDate);
        PawnTicket savedTicket = pawnTicketRepository.save(ticket);
        pawnHistoryRepository.save(historyBuilder.build());

        return savedTicket;
    }

    public double calculateInterestRate(double principal) {
        if (principal <= 6990) return 2.0;
        if (principal <= 9999) return 2.0; // Reduction handled in interest calculation
        return 1.25;
    }

    public Map<String, Object> getSuggestedInterest(Long ticketId) {
        PawnTicket ticket = pawnTicketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("ไม่พบตั๋วจำนำ"));
        
        PawnHistory lastAction = pawnHistoryRepository.findByPawnTicketIdOrderByCreatedAtDesc(ticketId).stream()
                .filter(h -> "RENEW".equals(h.getActionType()) || "CREATE".equals(h.getActionType()))
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
        double reduction = (principal >= 7000 && principal <= 9999) ? 20.0 : 0.0;
        
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
                .filter(t -> "ACTIVE".equals(t.getStatus()))
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
