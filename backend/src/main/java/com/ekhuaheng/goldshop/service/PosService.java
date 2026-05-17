package com.ekhuaheng.goldshop.service;

import com.ekhuaheng.goldshop.dto.CheckoutItemRequest;
import com.ekhuaheng.goldshop.dto.CheckoutRequest;
import com.ekhuaheng.goldshop.dto.CancelTransactionRequest;
import com.ekhuaheng.goldshop.config.SheetNames;
import com.ekhuaheng.goldshop.entity.*;
import com.ekhuaheng.goldshop.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PosService {

    private final TransactionRepository transactionRepository;
    private final TransactionItemRepository transactionItemRepository;
    private final TransactionPaymentRepository transactionPaymentRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final DocumentNumberService documentNumberService;
    private final GoogleSheetsService sheetsService;
    private final AuditLogService auditLogService;
    private final GoldPriceService goldPriceService;
    private final BusinessSettingsService settingsService;

    @Transactional
    public Transaction checkout(CheckoutRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้งานในระบบ"));

        Customer customer = null;
        if (request.getCustomerId() != null) {
            customer = customerRepository.findById(request.getCustomerId()).orElse(null);
        }
        List<com.ekhuaheng.goldshop.dto.CheckoutPaymentRequest> paymentRequests = normalizePayments(request);

        Transaction transaction = Transaction.builder()
                .receiptNumber(documentNumberService.receiptNumber())
                .customer(customer)
                .createdBy(user)
                .transactionType(request.getTransactionType())
                .totalAmount(request.getTotalAmount())
                .discount(request.getDiscount())
                .netAmount(request.getNetAmount())
                .paymentMethod(resolvePaymentMethod(paymentRequests))
                .status(TransactionStatus.ACTIVE)
                .items(new ArrayList<>())
                .payments(new ArrayList<>())
                .build();

        Transaction savedTransaction = transactionRepository.save(transaction);

        for (CheckoutItemRequest itemReq : request.getItems()) {
            Product product = null;
            if (itemReq.getProductId() != null) {
                product = productRepository.findById(itemReq.getProductId())
                        .orElseThrow(() -> new RuntimeException("ไม่พบสินค้า ID: " + itemReq.getProductId()));
            }

            if (itemReq.getItemType() == TransactionItemType.SELL && product == null) {
                throw new RuntimeException("รายการขายต้องระบุสินค้า");
            }

            if (product != null && product.getStatus() != ProductStatus.AVAILABLE && itemReq.getItemType() == TransactionItemType.SELL) {
                throw new RuntimeException("สินค้า " + product.getName() + " ไม่พร้อมขาย (สถานะ: " + product.getStatus() + ")");
            }

            if (itemReq.getItemType() == TransactionItemType.SELL) {
                validateSellPrice(itemReq, product, user);
            }

            TransactionItem item = TransactionItem.builder()
                    .transaction(savedTransaction)
                    .product(product)
                    .itemType(itemReq.getItemType())
                    .price(itemReq.getPrice())
                    .fee(itemReq.getFee())
                    .build();

            transactionItemRepository.save(item);
            
            // Update product status
            if (product != null && itemReq.getItemType() == TransactionItemType.SELL) {
                product.setStatus(ProductStatus.SOLD);
            } else if (itemReq.getItemType() == TransactionItemType.BUY) {
                if (product != null) {
                    product.setStatus(ProductStatus.AVAILABLE);
                }
            }
            if (product != null) {
                productRepository.save(product);
            }
            
            savedTransaction.getItems().add(item);
        }

        for (com.ekhuaheng.goldshop.dto.CheckoutPaymentRequest paymentReq : paymentRequests) {
            TransactionPayment payment = TransactionPayment.builder()
                    .transaction(savedTransaction)
                    .paymentMethod(paymentReq.getPaymentMethod())
                    .amount(paymentReq.getAmount())
                    .referenceNo(paymentReq.getReferenceNo())
                    .build();
            transactionPaymentRepository.save(payment);
            savedTransaction.getPayments().add(payment);
        }

        sheetsService.insertData(SheetNames.TRANSACTIONS, java.util.Map.of(
                "id", savedTransaction.getId(),
                "receiptNumber", savedTransaction.getReceiptNumber(),
                "transactionType", savedTransaction.getTransactionType().name(),
                "netAmount", savedTransaction.getNetAmount(),
                "paymentMethod", savedTransaction.getPaymentMethod().name()
        ));
        auditLogService.record("CHECKOUT", "Transaction", savedTransaction.getId(), savedTransaction.getReceiptNumber());

        return savedTransaction;
    }

    @Transactional
    public Transaction cancelTransaction(Long transactionId, CancelTransactionRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้งานในระบบ"));

        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("ไม่พบบิล ID: " + transactionId));

        if (transaction.getStatus() == TransactionStatus.VOIDED) {
            throw new RuntimeException("บิลนี้ถูกยกเลิกไปแล้ว");
        }

        for (TransactionItem item : transaction.getItems() == null ? List.<TransactionItem>of() : transaction.getItems()) {
            Product product = item.getProduct();
            if (product != null && item.getItemType() == TransactionItemType.SELL && product.getStatus() == ProductStatus.SOLD) {
                product.setStatus(ProductStatus.AVAILABLE);
                productRepository.save(product);
            }
        }

        transaction.setStatus(TransactionStatus.VOIDED);
        transaction.setCanceledBy(user);
        transaction.setCanceledAt(LocalDateTime.now());
        transaction.setCancelReason(request.getReason());
        Transaction canceled = transactionRepository.save(transaction);

        auditLogService.record("VOID_TRANSACTION", "Transaction", canceled.getId(), canceled.getReceiptNumber() + " - " + request.getReason());
        return canceled;
    }

    private void validateSellPrice(CheckoutItemRequest itemReq, Product product, User user) {
        if (product == null) {
            throw new RuntimeException("รายการขายต้องระบุสินค้า");
        }
        double weightGram = valueOrZero(product.getWeightGram());
        double gramsPerBaht = settingsService.gramsPerBaht().doubleValue();
        double barSellPrice = goldPriceService.getCurrentBarSellPrice();
        double requestedFee = valueOrZero(itemReq.getFee());
        double allowedDiscount = maxMakingFeeDiscount(user.getRole());
        double minimumAllowedPrice = (weightGram / gramsPerBaht * barSellPrice) + requestedFee - allowedDiscount;

        if (valueOrZero(itemReq.getPrice()) + 0.01 < minimumAllowedPrice) {
            throw new RuntimeException("ราคาขายต่ำกว่าสิทธิ์ส่วนลดของผู้ใช้งาน ต้องให้ผู้มีสิทธิ์อนุมัติ");
        }
    }

    private double maxMakingFeeDiscount(Role role) {
        return switch (role) {
            case OWNER -> settingsService.ownerMaxMakingFeeDiscount().doubleValue();
            case MANAGER -> settingsService.managerMaxMakingFeeDiscount().doubleValue();
            case STAFF, CASHIER -> settingsService.cashierMaxMakingFeeDiscount().doubleValue();
            case ACCOUNT -> 0.0;
        };
    }

    private List<com.ekhuaheng.goldshop.dto.CheckoutPaymentRequest> normalizePayments(CheckoutRequest request) {
        List<com.ekhuaheng.goldshop.dto.CheckoutPaymentRequest> payments = request.getPayments() == null
                ? new ArrayList<>()
                : request.getPayments().stream()
                        .filter(payment -> payment.getAmount() != null && payment.getAmount() > 0)
                        .toList();

        if (payments.isEmpty()) {
            if (request.getPaymentMethod() == null) {
                throw new RuntimeException("กรุณาระบุช่องทางชำระเงิน");
            }
            com.ekhuaheng.goldshop.dto.CheckoutPaymentRequest payment = new com.ekhuaheng.goldshop.dto.CheckoutPaymentRequest();
            payment.setPaymentMethod(request.getPaymentMethod());
            payment.setAmount(Math.abs(valueOrZero(request.getNetAmount())));
            payments = List.of(payment);
        }

        double expectedAmount = Math.abs(valueOrZero(request.getNetAmount()));
        double paidAmount = payments.stream().mapToDouble(payment -> valueOrZero(payment.getAmount())).sum();
        if (expectedAmount > 0 && Math.abs(expectedAmount - paidAmount) > 0.01) {
            throw new RuntimeException("ยอดชำระไม่ตรงกับยอดสุทธิ");
        }
        return payments;
    }

    private PaymentMethod resolvePaymentMethod(List<com.ekhuaheng.goldshop.dto.CheckoutPaymentRequest> payments) {
        if (payments.size() > 1) {
            return PaymentMethod.MIXED;
        }
        return payments.get(0).getPaymentMethod();
    }

    private double valueOrZero(Double value) {
        return value == null ? 0.0 : value;
    }
}
