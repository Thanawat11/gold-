package com.ekhuaheng.goldshop.service;

import com.ekhuaheng.goldshop.dto.CheckoutItemRequest;
import com.ekhuaheng.goldshop.dto.CheckoutRequest;
import com.ekhuaheng.goldshop.config.SheetNames;
import com.ekhuaheng.goldshop.entity.*;
import com.ekhuaheng.goldshop.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PosService {

    private final TransactionRepository transactionRepository;
    private final TransactionItemRepository transactionItemRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final DocumentNumberService documentNumberService;
    private final GoogleSheetsService sheetsService;
    private final AuditLogService auditLogService;

    @Transactional
    public Transaction checkout(CheckoutRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้งานในระบบ"));

        Customer customer = null;
        if (request.getCustomerId() != null) {
            customer = customerRepository.findById(request.getCustomerId()).orElse(null);
        }

        Transaction transaction = Transaction.builder()
                .receiptNumber(documentNumberService.receiptNumber())
                .customer(customer)
                .createdBy(user)
                .transactionType(request.getTransactionType())
                .totalAmount(request.getTotalAmount())
                .discount(request.getDiscount())
                .netAmount(request.getNetAmount())
                .paymentMethod(request.getPaymentMethod())
                .items(new ArrayList<>())
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
}
