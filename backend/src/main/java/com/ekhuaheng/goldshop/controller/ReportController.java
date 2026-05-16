package com.ekhuaheng.goldshop.controller;

import com.ekhuaheng.goldshop.entity.ProductStatus;
import com.ekhuaheng.goldshop.repository.ProductRepository;
import com.ekhuaheng.goldshop.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final TransactionRepository transactionRepository;
    private final ProductRepository productRepository;

    @GetMapping("/daily")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER')")
    public ResponseEntity<?> daily() {
        LocalDate today = LocalDate.now();
        var transactions = transactionRepository.findByTransactionDateBetween(
                today.atStartOfDay(),
                today.plusDays(1).atStartOfDay()
        );
        double netAmount = transactions.stream()
                .mapToDouble(transaction -> transaction.getNetAmount() == null ? 0.0 : transaction.getNetAmount())
                .sum();
        return ResponseEntity.ok(Map.of(
                "date", today,
                "transactionCount", transactions.size(),
                "netAmount", netAmount,
                "availableProductCount", productRepository.countByStatus(ProductStatus.AVAILABLE)
        ));
    }

    @GetMapping(value = "/daily.csv", produces = "text/csv")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER')")
    public ResponseEntity<String> dailyCsv() {
        LocalDate today = LocalDate.now();
        var transactions = transactionRepository.findByTransactionDateBetween(
                today.atStartOfDay(),
                today.plusDays(1).atStartOfDay()
        );
        StringBuilder csv = new StringBuilder("receiptNumber,transactionType,netAmount,paymentMethod,transactionDate\n");
        transactions.forEach(transaction -> csv.append(transaction.getReceiptNumber()).append(',')
                .append(transaction.getTransactionType()).append(',')
                .append(transaction.getNetAmount()).append(',')
                .append(transaction.getPaymentMethod()).append(',')
                .append(transaction.getTransactionDate()).append('\n'));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=daily-report.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.toString());
    }
}
