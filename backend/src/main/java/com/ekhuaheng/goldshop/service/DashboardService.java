package com.ekhuaheng.goldshop.service;

import com.ekhuaheng.goldshop.entity.PawnStatus;
import com.ekhuaheng.goldshop.entity.Product;
import com.ekhuaheng.goldshop.entity.ProductStatus;
import com.ekhuaheng.goldshop.entity.Transaction;
import com.ekhuaheng.goldshop.repository.PawnTicketRepository;
import com.ekhuaheng.goldshop.repository.ProductRepository;
import com.ekhuaheng.goldshop.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TransactionRepository transactionRepository;
    private final PawnTicketRepository pawnTicketRepository;
    private final ProductRepository productRepository;

    public Map<String, Object> summary() {
        LocalDate today = LocalDate.now();
        List<Transaction> todayTransactions = transactionRepository.findByTransactionDateBetween(
                today.atStartOfDay(),
                today.plusDays(1).atStartOfDay()
        );

        double salesAmount = todayTransactions.stream()
                .mapToDouble(transaction -> transaction.getNetAmount() == null ? 0.0 : transaction.getNetAmount())
                .sum();
        long nearDueTickets = pawnTicketRepository
                .findByStatusAndDueDateLessThanEqual(PawnStatus.ACTIVE, today.plusDays(7))
                .size();
        double inventoryWeight = productRepository.findByStatus(ProductStatus.AVAILABLE).stream()
                .mapToDouble(product -> product.getWeightGram() == null ? 0.0 : product.getWeightGram())
                .sum();
        List<Map<String, Object>> lowStock = lowStockByCategory();

        return Map.of(
                "dailySalesAmount", salesAmount,
                "dailyTransactionCount", todayTransactions.size(),
                "nearDuePawnTickets", nearDueTickets,
                "availableInventoryWeightGram", inventoryWeight,
                "availableProductCount", productRepository.countByStatus(ProductStatus.AVAILABLE),
                "lowStock", lowStock
        );
    }

    private List<Map<String, Object>> lowStockByCategory() {
        return productRepository.findByStatus(ProductStatus.AVAILABLE).stream()
                .collect(Collectors.groupingBy(Product::getCategory, Collectors.counting()))
                .entrySet()
                .stream()
                .filter(entry -> entry.getValue() <= 2)
                .sorted(Comparator.comparing(Map.Entry<String, Long>::getValue))
                .map(entry -> Map.<String, Object>of("category", entry.getKey(), "count", entry.getValue()))
                .toList();
    }
}
