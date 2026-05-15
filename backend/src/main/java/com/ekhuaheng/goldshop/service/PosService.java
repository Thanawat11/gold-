package com.ekhuaheng.goldshop.service;

import com.ekhuaheng.goldshop.dto.CheckoutItemRequest;
import com.ekhuaheng.goldshop.dto.CheckoutRequest;
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
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new RuntimeException("ไม่พบสินค้า ID: " + itemReq.getProductId()));

            if (!"AVAILABLE".equals(product.getStatus()) && "SELL".equals(itemReq.getItemType())) {
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
            if ("SELL".equals(itemReq.getItemType())) {
                product.setStatus("SOLD");
            } else if ("BUY".equals(itemReq.getItemType())) {
                product.setStatus("AVAILABLE"); // Bought back, now available for sale
            }
            productRepository.save(product);
            
            savedTransaction.getItems().add(item);
        }

        return savedTransaction;
    }
}
