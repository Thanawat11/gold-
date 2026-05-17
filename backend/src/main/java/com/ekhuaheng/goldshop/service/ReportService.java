package com.ekhuaheng.goldshop.service;

import com.ekhuaheng.goldshop.dto.OwnerReportResponse;
import com.ekhuaheng.goldshop.entity.*;
import com.ekhuaheng.goldshop.repository.PawnHistoryRepository;
import com.ekhuaheng.goldshop.repository.PawnTicketRepository;
import com.ekhuaheng.goldshop.repository.ProductRepository;
import com.ekhuaheng.goldshop.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ReportService {

    private static final String PERIOD_DAILY = "DAILY";
    private static final String PERIOD_MONTHLY = "MONTHLY";
    private static final String PERIOD_YEARLY = "YEARLY";
    private static final double VAT_RATE = 7.0;

    private final TransactionRepository transactionRepository;
    private final ProductRepository productRepository;
    private final PawnTicketRepository pawnTicketRepository;
    private final PawnHistoryRepository pawnHistoryRepository;
    private final BusinessSettingsService settingsService;

    @Transactional(readOnly = true)
    public OwnerReportResponse ownerReport(LocalDate fromDate, LocalDate toDate, String period) {
        LocalDate today = LocalDate.now();
        LocalDate startDate = fromDate == null ? today.withDayOfMonth(1) : fromDate;
        LocalDate endDate = toDate == null ? today : toDate;
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น");
        }

        String normalizedPeriod = normalizePeriod(period);
        LocalDateTime startAt = startDate.atStartOfDay();
        LocalDateTime endExclusive = endDate.plusDays(1).atStartOfDay();
        List<Transaction> transactions = transactionRepository.findByTransactionDateBetween(startAt, endExclusive);
        List<PawnHistory> pawnHistories = pawnHistoryRepository.findByCreatedAtBetween(startAt, endExclusive);
        List<PawnTicket> pawnTickets = pawnTicketRepository.findAll();
        List<Product> products = productRepository.findAll();
        Role currentRole = currentRole();
        boolean canViewProfit = currentRole == Role.OWNER;
        boolean canExport = currentRole == Role.OWNER || currentRole == Role.ACCOUNT;
        boolean canCancelTransactions = currentRole == Role.OWNER;

        Map<String, PeriodAccumulator> periodRows = seedPeriodRows(startDate, endDate, normalizedPeriod);
        Map<Long, EmployeeAccumulator> employeeRows = new LinkedHashMap<>();
        List<OwnerReportResponse.ProfitReportRow> profitRows = new ArrayList<>();
        List<OwnerReportResponse.OldGoldPurchaseRow> oldGoldPurchaseRows = new ArrayList<>();
        List<OwnerReportResponse.TransactionReportRow> transactionRows = transactions.stream()
                .sorted(Comparator.comparing(Transaction::getTransactionDate, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .map(this::transactionReportRow)
                .toList();
        TotalsAccumulator totals = new TotalsAccumulator();

        transactions.stream()
                .filter(this::isActive)
                .sorted(Comparator.comparing(Transaction::getTransactionDate))
                .forEach(transaction -> collectTransaction(transaction, normalizedPeriod, periodRows, employeeRows,
                        profitRows, oldGoldPurchaseRows, totals));

        double interestIncome = pawnHistories.stream()
                .mapToDouble(history -> value(history.getInterestPaid()))
                .sum();
        pawnHistories.forEach(history -> periodRows
                .computeIfAbsent(periodKey(history.getCreatedAt().toLocalDate(), normalizedPeriod), PeriodAccumulator::new)
                .interestIncome += value(history.getInterestPaid()));

        List<OwnerReportResponse.PawnOutstandingRow> outstandingTickets = pawnTickets.stream()
                .filter(ticket -> ticket.getStatus() == PawnStatus.ACTIVE)
                .sorted(Comparator.comparing(PawnTicket::getDueDate))
                .map(ticket -> new OwnerReportResponse.PawnOutstandingRow(
                        ticket.getTicketNumber(),
                        customerName(ticket.getCustomer()),
                        productName(ticket.getProduct()),
                        productWeight(ticket.getProduct()),
                        value(ticket.getPrincipalAmount()),
                        value(ticket.getInterestRate()),
                        ticket.getPawnDate(),
                        ticket.getDueDate(),
                        java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), ticket.getDueDate())
                ))
                .toList();

        List<OwnerReportResponse.PawnExpiredRow> expiredTickets = pawnHistories.stream()
                .filter(history -> history.getActionType() == PawnActionType.EXPIRE)
                .sorted(Comparator.comparing(PawnHistory::getCreatedAt).reversed())
                .map(history -> {
                    PawnTicket ticket = history.getPawnTicket();
                    return new OwnerReportResponse.PawnExpiredRow(
                            ticket.getTicketNumber(),
                            customerName(ticket.getCustomer()),
                            productName(ticket.getProduct()),
                            productWeight(ticket.getProduct()),
                            value(ticket.getPrincipalAmount()),
                            ticket.getDueDate(),
                            history.getCreatedAt()
                    );
                })
                .toList();

        OwnerReportResponse.InventoryReport inventory = buildInventoryReport(products);
        OwnerReportResponse.TaxReport tax = buildTaxReport(totals.salesAmount);
        OwnerReportResponse.PawnReport pawn = new OwnerReportResponse.PawnReport(
                outstandingTickets.size(),
                money(outstandingTickets.stream().mapToDouble(OwnerReportResponse.PawnOutstandingRow::principalAmount).sum()),
                money(interestIncome),
                outstandingTickets,
                expiredTickets
        );

        OwnerReportResponse.ReportTotals reportTotals = new OwnerReportResponse.ReportTotals(
                totals.transactionCount,
                money(totals.salesAmount + interestIncome),
                money(totals.salesAmount),
                money(totals.buyOldGoldAmount),
                canViewProfit ? money(totals.salesProfit) : 0.0,
                canViewProfit ? money(totals.salesProfit + interestIncome) : 0.0,
                canViewProfit ? totals.unknownCostItemCount : 0,
                money(totals.cashInAmount),
                money(totals.cashOutAmount),
                money(totals.cashInAmount - totals.cashOutAmount),
                pawn.activePrincipalAmount(),
                pawn.interestIncome(),
                expiredTickets.size(),
                inventory.availableWeightGram(),
                inventory.availableGoldBaht(),
                inventory.availableProductCount(),
                tax.taxBaseAmount(),
                tax.vatAmount()
        );

        return new OwnerReportResponse(
                startDate,
                endDate,
                normalizedPeriod,
                canViewProfit,
                canExport,
                canCancelTransactions,
                reportTotals,
                periodRows.values().stream().map(row -> row.toRow(canViewProfit)).toList(),
                transactionRows,
                canViewProfit ? profitRows : List.of(),
                oldGoldPurchaseRows,
                pawn,
                canViewProfit ? inventory : maskInventoryCosts(inventory),
                tax,
                employeeRows.values().stream()
                        .sorted(Comparator.comparing(EmployeeAccumulator::salesAmount).reversed())
                        .map(row -> row.toRow(canViewProfit))
                        .toList()
        );
    }

    private void collectTransaction(
            Transaction transaction,
            String period,
            Map<String, PeriodAccumulator> periodRows,
            Map<Long, EmployeeAccumulator> employeeRows,
            List<OwnerReportResponse.ProfitReportRow> profitRows,
            List<OwnerReportResponse.OldGoldPurchaseRow> oldGoldPurchaseRows,
            TotalsAccumulator totals
    ) {
        if (transaction.getTransactionDate() == null) {
            return;
        }

        String periodKey = periodKey(transaction.getTransactionDate().toLocalDate(), period);
        PeriodAccumulator periodAccumulator = periodRows.computeIfAbsent(periodKey, PeriodAccumulator::new);
        EmployeeAccumulator employeeAccumulator = employeeRows.computeIfAbsent(
                transaction.getCreatedBy().getId(),
                id -> new EmployeeAccumulator(transaction.getCreatedBy())
        );

        totals.transactionCount++;
        periodAccumulator.transactionCount++;
        employeeAccumulator.transactionCount++;
        CashFlow cashFlow = cashFlow(transaction);
        totals.cashInAmount += cashFlow.inAmount();
        totals.cashOutAmount += cashFlow.outAmount();
        periodAccumulator.cashInAmount += cashFlow.inAmount();
        periodAccumulator.cashOutAmount += cashFlow.outAmount();

        for (TransactionItem item : safeItems(transaction)) {
            double amount = value(item.getPrice());
            if (item.getItemType() == TransactionItemType.SELL) {
                Product product = item.getProduct();
                boolean costKnown = product != null && product.getCostAmount() != null;
                double costAmount = costKnown ? value(product.getCostAmount()) : 0.0;
                double profitAmount = costKnown ? amount - costAmount : 0.0;

                totals.salesAmount += amount;
                periodAccumulator.salesAmount += amount;
                employeeAccumulator.salesAmount += amount;

                if (costKnown) {
                    totals.salesProfit += profitAmount;
                    periodAccumulator.salesProfit += profitAmount;
                    employeeAccumulator.salesProfit += profitAmount;
                } else {
                    totals.unknownCostItemCount++;
                    employeeAccumulator.unknownCostItemCount++;
                }

                profitRows.add(new OwnerReportResponse.ProfitReportRow(
                        transaction.getReceiptNumber(),
                        transaction.getTransactionDate(),
                        productName(product),
                        productCategory(product),
                        fullName(transaction.getCreatedBy()),
                        money(amount),
                        money(costAmount),
                        money(profitAmount),
                        costKnown
                ));
            } else if (item.getItemType() == TransactionItemType.BUY) {
                totals.buyOldGoldAmount += amount;
                periodAccumulator.buyOldGoldAmount += amount;
                employeeAccumulator.buyOldGoldAmount += amount;
                oldGoldPurchaseRows.add(new OwnerReportResponse.OldGoldPurchaseRow(
                        transaction.getReceiptNumber(),
                        transaction.getTransactionDate(),
                        productName(item.getProduct()),
                        item.getProduct() == null ? null : value(item.getProduct().getWeightGram()),
                        money(amount),
                        fullName(transaction.getCreatedBy())
                ));
            }
        }
    }

    private OwnerReportResponse.InventoryReport buildInventoryReport(List<Product> products) {
        Map<String, InventoryAccumulator> byStatus = new TreeMap<>();
        Map<String, InventoryAccumulator> byCategory = new TreeMap<>();
        Map<String, InventoryAccumulator> byWeight = new TreeMap<>();

        for (Product product : products) {
            byStatus.computeIfAbsent(product.getStatus().name(), InventoryAccumulator::new).add(product);
            byCategory.computeIfAbsent(productCategory(product), InventoryAccumulator::new).add(product);
            byWeight.computeIfAbsent(weightLabel(product), InventoryAccumulator::new).add(product);
        }

        long availableCount = products.stream().filter(product -> product.getStatus() == ProductStatus.AVAILABLE).count();
        double totalWeight = products.stream().mapToDouble(product -> value(product.getWeightGram())).sum();
        double availableWeight = products.stream()
                .filter(product -> product.getStatus() == ProductStatus.AVAILABLE)
                .mapToDouble(product -> value(product.getWeightGram()))
                .sum();
        double gramsPerBaht = settingsService.gramsPerBaht().doubleValue();
        double stockCost = products.stream().mapToDouble(product -> value(product.getCostAmount())).sum();

        return new OwnerReportResponse.InventoryReport(
                products.size(),
                availableCount,
                money(totalWeight),
                money(availableWeight),
                money(totalWeight / gramsPerBaht),
                money(availableWeight / gramsPerBaht),
                money(stockCost),
                byStatus.values().stream().map(InventoryAccumulator::toStatusRow).toList(),
                byCategory.values().stream().map(InventoryAccumulator::toCategoryRow).toList(),
                byWeight.values().stream().map(InventoryAccumulator::toWeightRow).toList()
        );
    }

    private OwnerReportResponse.TaxReport buildTaxReport(double salesAmount) {
        double vatAmount = salesAmount * VAT_RATE / (100.0 + VAT_RATE);
        return new OwnerReportResponse.TaxReport(
                money(salesAmount),
                money(salesAmount - vatAmount),
                money(vatAmount),
                VAT_RATE
        );
    }

    private OwnerReportResponse.TransactionReportRow transactionReportRow(Transaction transaction) {
        CashFlow cashFlow = isActive(transaction) ? cashFlow(transaction) : new CashFlow(0.0, 0.0);
        return new OwnerReportResponse.TransactionReportRow(
                transaction.getId(),
                transaction.getReceiptNumber(),
                transaction.getTransactionDate(),
                transaction.getTransactionType().name(),
                transaction.getPaymentMethod().name(),
                transactionStatus(transaction).name(),
                customerName(transaction.getCustomer()),
                fullName(transaction.getCreatedBy()),
                money(value(transaction.getNetAmount())),
                money(cashFlow.inAmount()),
                money(cashFlow.outAmount()),
                transaction.getCancelReason(),
                transaction.getCanceledAt()
        );
    }

    private CashFlow cashFlow(Transaction transaction) {
        double cashAmount = cashPaymentAmount(transaction);
        if (cashAmount <= 0) {
            return new CashFlow(0.0, 0.0);
        }
        return isCashOut(transaction) ? new CashFlow(0.0, cashAmount) : new CashFlow(cashAmount, 0.0);
    }

    private double cashPaymentAmount(Transaction transaction) {
        if (transaction.getPayments() != null && !transaction.getPayments().isEmpty()) {
            return transaction.getPayments().stream()
                    .filter(payment -> payment.getPaymentMethod() == PaymentMethod.CASH)
                    .mapToDouble(payment -> value(payment.getAmount()))
                    .sum();
        }
        if (transaction.getPaymentMethod() == PaymentMethod.CASH) {
            return Math.abs(value(transaction.getNetAmount()));
        }
        return 0.0;
    }

    private boolean isCashOut(Transaction transaction) {
        if (transaction.getTransactionType() == TransactionType.BUY) {
            return true;
        }
        return value(transaction.getNetAmount()) < 0;
    }

    private boolean isActive(Transaction transaction) {
        return transactionStatus(transaction) == TransactionStatus.ACTIVE;
    }

    private TransactionStatus transactionStatus(Transaction transaction) {
        return transaction.getStatus() == null ? TransactionStatus.ACTIVE : transaction.getStatus();
    }

    private OwnerReportResponse.InventoryReport maskInventoryCosts(OwnerReportResponse.InventoryReport inventory) {
        return new OwnerReportResponse.InventoryReport(
                inventory.totalProductCount(),
                inventory.availableProductCount(),
                inventory.totalWeightGram(),
                inventory.availableWeightGram(),
                inventory.totalGoldBaht(),
                inventory.availableGoldBaht(),
                0.0,
                inventory.byStatus().stream()
                        .map(row -> new OwnerReportResponse.InventoryStatusRow(row.status(), row.count(), row.weightGram(), 0.0))
                        .toList(),
                inventory.byCategory().stream()
                        .map(row -> new OwnerReportResponse.InventoryCategoryRow(row.category(), row.count(), row.weightGram(), 0.0))
                        .toList(),
                inventory.byWeight().stream()
                        .map(row -> new OwnerReportResponse.InventoryWeightRow(row.weightLabel(), row.count(), row.weightGram(), 0.0))
                        .toList()
        );
    }

    private Role currentRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user.getRole();
        }
        return Role.STAFF;
    }

    private Map<String, PeriodAccumulator> seedPeriodRows(LocalDate startDate, LocalDate endDate, String period) {
        Map<String, PeriodAccumulator> rows = new TreeMap<>();
        if (PERIOD_MONTHLY.equals(period)) {
            YearMonth current = YearMonth.from(startDate);
            YearMonth end = YearMonth.from(endDate);
            while (!current.isAfter(end)) {
                rows.put(current.toString(), new PeriodAccumulator(current.toString()));
                current = current.plusMonths(1);
            }
            return rows;
        }
        if (PERIOD_YEARLY.equals(period)) {
            int current = startDate.getYear();
            int end = endDate.getYear();
            while (current <= end) {
                rows.put(String.valueOf(current), new PeriodAccumulator(String.valueOf(current)));
                current++;
            }
            return rows;
        }
        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            rows.put(current.toString(), new PeriodAccumulator(current.toString()));
            current = current.plusDays(1);
        }
        return rows;
    }

    private String periodKey(LocalDate date, String period) {
        if (PERIOD_MONTHLY.equals(period)) {
            return YearMonth.from(date).toString();
        }
        if (PERIOD_YEARLY.equals(period)) {
            return String.valueOf(date.getYear());
        }
        return date.toString();
    }

    private String normalizePeriod(String period) {
        if (period == null || period.isBlank()) {
            return PERIOD_DAILY;
        }
        String normalized = period.trim().toUpperCase(Locale.ROOT);
        if (PERIOD_MONTHLY.equals(normalized) || PERIOD_YEARLY.equals(normalized)) {
            return normalized;
        }
        return PERIOD_DAILY;
    }

    private List<TransactionItem> safeItems(Transaction transaction) {
        return transaction.getItems() == null ? List.of() : transaction.getItems();
    }

    private String customerName(Customer customer) {
        return customer == null ? "-" : customer.getFullName();
    }

    private String fullName(User user) {
        return user == null ? "-" : user.getFullName();
    }

    private String productName(Product product) {
        return product == null ? "ทองเก่ารับซื้อ" : product.getName();
    }

    private String productCategory(Product product) {
        if (product == null || product.getCategory() == null || product.getCategory().isBlank()) {
            return "ไม่ระบุ";
        }
        return product.getCategory();
    }

    private double productWeight(Product product) {
        return product == null ? 0.0 : value(product.getWeightGram());
    }

    private String weightLabel(Product product) {
        if (product == null) {
            return "ไม่ระบุ";
        }
        if (product.getWeightText() != null && !product.getWeightText().isBlank()) {
            return product.getWeightText();
        }
        double weightGram = value(product.getWeightGram());
        double gramsPerBaht = settingsService.gramsPerBaht().doubleValue();
        if (weightGram <= 0 || gramsPerBaht <= 0) {
            return "ไม่ระบุ";
        }
        double salueng = weightGram / gramsPerBaht * 4.0;
        int roundedSalueng = (int) Math.round(salueng);
        if (Math.abs(salueng - roundedSalueng) <= 0.03) {
            if (roundedSalueng == 4) {
                return "1 บาท";
            }
            return roundedSalueng + " สลึง";
        }
        return money(weightGram) + " กรัม";
    }

    private double value(Double value) {
        return value == null ? 0.0 : value;
    }

    private double money(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private static class TotalsAccumulator {
        private long transactionCount;
        private double salesAmount;
        private double buyOldGoldAmount;
        private double salesProfit;
        private long unknownCostItemCount;
        private double cashInAmount;
        private double cashOutAmount;
    }

    private class PeriodAccumulator {
        private final String periodKey;
        private long transactionCount;
        private double salesAmount;
        private double buyOldGoldAmount;
        private double salesProfit;
        private double cashInAmount;
        private double cashOutAmount;
        private double interestIncome;

        private PeriodAccumulator(String periodKey) {
            this.periodKey = periodKey;
        }

        private OwnerReportResponse.PeriodReportRow toRow(boolean canViewProfit) {
            return new OwnerReportResponse.PeriodReportRow(
                    periodKey,
                    transactionCount,
                    money(salesAmount + interestIncome),
                    money(salesAmount),
                    money(buyOldGoldAmount),
                    canViewProfit ? money(salesProfit) : 0.0,
                    canViewProfit ? money(salesProfit + interestIncome) : 0.0,
                    money(cashInAmount),
                    money(cashOutAmount),
                    money(interestIncome)
            );
        }
    }

    private class EmployeeAccumulator {
        private final User user;
        private long transactionCount;
        private double salesAmount;
        private double buyOldGoldAmount;
        private double salesProfit;
        private long unknownCostItemCount;

        private EmployeeAccumulator(User user) {
            this.user = user;
        }

        private double salesAmount() {
            return salesAmount;
        }

        private OwnerReportResponse.EmployeeSalesRow toRow(boolean canViewProfit) {
            return new OwnerReportResponse.EmployeeSalesRow(
                    user.getUsername(),
                    user.getFullName(),
                    transactionCount,
                    money(salesAmount),
                    money(buyOldGoldAmount),
                    canViewProfit ? money(salesProfit) : 0.0,
                    canViewProfit ? unknownCostItemCount : 0
            );
        }
    }

    private record CashFlow(double inAmount, double outAmount) {
    }

    private class InventoryAccumulator {
        private final String label;
        private long count;
        private double weightGram;
        private double costAmount;

        private InventoryAccumulator(String label) {
            this.label = label;
        }

        private void add(Product product) {
            count++;
            weightGram += value(product.getWeightGram());
            costAmount += value(product.getCostAmount());
        }

        private OwnerReportResponse.InventoryStatusRow toStatusRow() {
            return new OwnerReportResponse.InventoryStatusRow(label, count, money(weightGram), money(costAmount));
        }

        private OwnerReportResponse.InventoryCategoryRow toCategoryRow() {
            return new OwnerReportResponse.InventoryCategoryRow(label, count, money(weightGram), money(costAmount));
        }

        private OwnerReportResponse.InventoryWeightRow toWeightRow() {
            return new OwnerReportResponse.InventoryWeightRow(label, count, money(weightGram), money(costAmount));
        }
    }
}
