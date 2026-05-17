package com.ekhuaheng.goldshop.service;

import com.ekhuaheng.goldshop.config.SheetNames;
import com.ekhuaheng.goldshop.dto.CustomerProfileResponse;
import com.ekhuaheng.goldshop.dto.CustomerRequest;
import com.ekhuaheng.goldshop.entity.Customer;
import com.ekhuaheng.goldshop.entity.CustomerTrustLevel;
import com.ekhuaheng.goldshop.entity.IdentityType;
import com.ekhuaheng.goldshop.entity.PawnStatus;
import com.ekhuaheng.goldshop.entity.PawnTicket;
import com.ekhuaheng.goldshop.entity.Transaction;
import com.ekhuaheng.goldshop.entity.TransactionType;
import com.ekhuaheng.goldshop.repository.CustomerRepository;
import com.ekhuaheng.goldshop.repository.PawnTicketRepository;
import com.ekhuaheng.goldshop.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final TransactionRepository transactionRepository;
    private final PawnTicketRepository pawnTicketRepository;
    private final GoogleSheetsService sheetsService;
    private final AuditLogService auditLogService;

    public List<Customer> getCustomers() {
        return customerRepository.findAll();
    }

    @Transactional
    public Customer createCustomer(CustomerRequest request) {
        ensureUniqueIdentity(request.getIdCardNumber(), null);
        Customer customer = Customer.builder().build();
        applyRequest(customer, request);
        Customer saved = customerRepository.save(customer);
        syncCustomerToSheets(saved);
        auditLogService.record("CREATE_CUSTOMER", "Customer", saved.getId(), saved.getFullName());
        return saved;
    }

    @Transactional
    public Customer updateCustomer(Long id, CustomerRequest request) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("ไม่พบลูกค้า"));
        ensureUniqueIdentity(request.getIdCardNumber(), id);
        applyRequest(customer, request);
        Customer saved = customerRepository.save(customer);
        auditLogService.record("UPDATE_CUSTOMER", "Customer", saved.getId(), saved.getFullName());
        return saved;
    }

    public CustomerProfileResponse getCustomerProfile(Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("ไม่พบลูกค้า"));
        List<Transaction> transactions = transactionRepository.findByCustomerIdOrderByTransactionDateDesc(id);
        List<PawnTicket> pawnTickets = pawnTicketRepository.findByCustomerIdOrderByCreatedAtDesc(id);

        List<CustomerProfileResponse.TransactionHistoryItem> purchaseHistory = transactions.stream()
                .filter(transaction -> transaction.getTransactionType() == TransactionType.SELL
                        || transaction.getTransactionType() == TransactionType.TRADE_IN)
                .map(this::transactionHistoryItem)
                .toList();
        List<CustomerProfileResponse.TransactionHistoryItem> goldSaleHistory = transactions.stream()
                .filter(transaction -> transaction.getTransactionType() == TransactionType.BUY
                        || transaction.getTransactionType() == TransactionType.TRADE_IN)
                .map(this::transactionHistoryItem)
                .toList();
        List<CustomerProfileResponse.PawnTicketHistoryItem> pawnHistory = pawnTickets.stream()
                .map(this::pawnHistoryItem)
                .toList();

        return CustomerProfileResponse.builder()
                .customer(customer)
                .purchaseHistory(purchaseHistory)
                .goldSaleHistory(goldSaleHistory)
                .pawnHistory(pawnHistory)
                .totalPurchaseAmount(sumNetAmount(purchaseHistory))
                .totalGoldSaleAmount(sumNetAmount(goldSaleHistory))
                .activePawnPrincipal(pawnTickets.stream()
                        .filter(ticket -> ticket.getStatus() == PawnStatus.ACTIVE)
                        .mapToDouble(ticket -> valueOrZero(ticket.getPrincipalAmount()))
                        .sum())
                .build();
    }

    private void applyRequest(Customer customer, CustomerRequest request) {
        customer.setFullName(request.getFullName().trim());
        customer.setPhoneNumber(blankToNull(request.getPhoneNumber()));
        customer.setIdentityType(request.getIdentityType() == null ? IdentityType.THAI_ID : request.getIdentityType());
        customer.setIdCardNumber(blankToNull(request.getIdCardNumber()));
        customer.setAddress(blankToNull(request.getAddress()));
        customer.setTrustLevel(request.getTrustLevel() == null ? CustomerTrustLevel.NORMAL : request.getTrustLevel());
        customer.setIdCardImageUrl(blankToNull(request.getIdCardImageUrl()));
        customer.setCustomerImageUrl(blankToNull(request.getCustomerImageUrl()));
        customer.setDocumentUrl(blankToNull(request.getDocumentUrl()));
        customer.setNotes(blankToNull(request.getNotes()));
    }

    private void ensureUniqueIdentity(String identityNumber, Long currentCustomerId) {
        if (!StringUtils.hasText(identityNumber)) {
            return;
        }
        customerRepository.findByIdCardNumber(identityNumber.trim())
                .filter(existing -> currentCustomerId == null || !existing.getId().equals(currentCustomerId))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("เลขบัตร/Passport นี้ถูกใช้กับลูกค้าคนอื่นแล้ว");
                });
    }

    private CustomerProfileResponse.TransactionHistoryItem transactionHistoryItem(Transaction transaction) {
        int itemCount = transaction.getItems() == null ? 0 : transaction.getItems().size();
        return CustomerProfileResponse.TransactionHistoryItem.builder()
                .id(transaction.getId())
                .receiptNumber(transaction.getReceiptNumber())
                .transactionType(transaction.getTransactionType())
                .netAmount(transaction.getNetAmount())
                .paymentMethod(transaction.getPaymentMethod())
                .transactionDate(transaction.getTransactionDate())
                .itemCount(itemCount)
                .build();
    }

    private CustomerProfileResponse.PawnTicketHistoryItem pawnHistoryItem(PawnTicket ticket) {
        return CustomerProfileResponse.PawnTicketHistoryItem.builder()
                .id(ticket.getId())
                .ticketNumber(ticket.getTicketNumber())
                .productName(ticket.getProduct() == null ? "-" : ticket.getProduct().getName())
                .principalAmount(ticket.getPrincipalAmount())
                .interestRate(ticket.getInterestRate())
                .pawnDate(ticket.getPawnDate())
                .dueDate(ticket.getDueDate())
                .status(ticket.getStatus())
                .build();
    }

    private Double sumNetAmount(List<CustomerProfileResponse.TransactionHistoryItem> items) {
        return items.stream().mapToDouble(item -> valueOrZero(item.getNetAmount())).sum();
    }

    private double valueOrZero(Double value) {
        return value == null ? 0.0 : value;
    }

    private String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private void syncCustomerToSheets(Customer customer) {
        try {
            sheetsService.insertData(SheetNames.CUSTOMERS, customerSheetRow(customer));
        } catch (Exception e) {
            log.error("Unable to sync customer to Google Sheets: {}", e.getMessage());
        }
    }

    private Map<String, Object> customerSheetRow(Customer customer) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", customer.getId());
        row.put("fullName", customer.getFullName());
        row.put("phone", customer.getPhoneNumber() == null ? "" : customer.getPhoneNumber());
        row.put("identityType", customer.getIdentityType() == null ? IdentityType.THAI_ID.name() : customer.getIdentityType().name());
        row.put("idCard", customer.getIdCardNumber() == null ? "" : customer.getIdCardNumber());
        row.put("address", customer.getAddress() == null ? "" : customer.getAddress());
        row.put("trustLevel", customer.getTrustLevel() == null ? CustomerTrustLevel.NORMAL.name() : customer.getTrustLevel().name());
        row.put("idCardImageUrl", customer.getIdCardImageUrl() == null ? "" : customer.getIdCardImageUrl());
        row.put("customerImageUrl", customer.getCustomerImageUrl() == null ? "" : customer.getCustomerImageUrl());
        row.put("documentUrl", customer.getDocumentUrl() == null ? "" : customer.getDocumentUrl());
        row.put("notes", customer.getNotes() == null ? "" : customer.getNotes());
        return row;
    }
}
