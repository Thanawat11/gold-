package com.ekhuaheng.goldshop.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record OwnerReportResponse(
        LocalDate fromDate,
        LocalDate toDate,
        String period,
        boolean canViewProfit,
        boolean canExport,
        boolean canCancelTransactions,
        ReportTotals totals,
        List<PeriodReportRow> periodRows,
        List<TransactionReportRow> transactionRows,
        List<ProfitReportRow> profitRows,
        List<OldGoldPurchaseRow> oldGoldPurchaseRows,
        PawnReport pawn,
        InventoryReport inventory,
        TaxReport tax,
        List<EmployeeSalesRow> employeeSalesRows
) {
    public record ReportTotals(
            long transactionCount,
            double revenueAmount,
            double salesAmount,
            double buyOldGoldAmount,
            double salesProfit,
            double estimatedNetProfit,
            long unknownCostItemCount,
            double cashInAmount,
            double cashOutAmount,
            double netCashAmount,
            double activePawnPrincipal,
            double interestIncome,
            long expiredPawnCount,
            double availableStockWeightGram,
            double availableStockGoldBaht,
            long availableStockCount,
            double taxBaseAmount,
            double vatAmount
    ) {
    }

    public record PeriodReportRow(
            String periodKey,
            long transactionCount,
            double revenueAmount,
            double salesAmount,
            double buyOldGoldAmount,
            double salesProfit,
            double estimatedNetProfit,
            double cashInAmount,
            double cashOutAmount,
            double interestIncome
    ) {
    }

    public record TransactionReportRow(
            Long id,
            String receiptNumber,
            LocalDateTime transactionDate,
            String transactionType,
            String paymentMethod,
            String status,
            String customerName,
            String cashierName,
            double netAmount,
            double cashInAmount,
            double cashOutAmount,
            String cancelReason,
            LocalDateTime canceledAt
    ) {
    }

    public record ProfitReportRow(
            String receiptNumber,
            LocalDateTime transactionDate,
            String productName,
            String category,
            String sellerName,
            double saleAmount,
            double costAmount,
            double profitAmount,
            boolean costKnown
    ) {
    }

    public record OldGoldPurchaseRow(
            String receiptNumber,
            LocalDateTime transactionDate,
            String description,
            Double weightGram,
            double amount,
            String cashierName
    ) {
    }

    public record PawnReport(
            long activeTicketCount,
            double activePrincipalAmount,
            double interestIncome,
            List<PawnOutstandingRow> outstandingTickets,
            List<PawnExpiredRow> expiredTickets
    ) {
    }

    public record PawnOutstandingRow(
            String ticketNumber,
            String customerName,
            String productName,
            double weightGram,
            double principalAmount,
            double interestRate,
            LocalDate pawnDate,
            LocalDate dueDate,
            long daysUntilDue
    ) {
    }

    public record PawnExpiredRow(
            String ticketNumber,
            String customerName,
            String productName,
            double weightGram,
            double principalAmount,
            LocalDate dueDate,
            LocalDateTime expiredAt
    ) {
    }

    public record InventoryReport(
            long totalProductCount,
            long availableProductCount,
            double totalWeightGram,
            double availableWeightGram,
            double totalGoldBaht,
            double availableGoldBaht,
            double stockCostAmount,
            List<InventoryStatusRow> byStatus,
            List<InventoryCategoryRow> byCategory,
            List<InventoryWeightRow> byWeight
    ) {
    }

    public record InventoryStatusRow(
            String status,
            long count,
            double weightGram,
            double costAmount
    ) {
    }

    public record InventoryCategoryRow(
            String category,
            long count,
            double weightGram,
            double costAmount
    ) {
    }

    public record InventoryWeightRow(
            String weightLabel,
            long count,
            double weightGram,
            double costAmount
    ) {
    }

    public record TaxReport(
            double salesAmount,
            double taxBaseAmount,
            double vatAmount,
            double vatRate
    ) {
    }

    public record EmployeeSalesRow(
            String username,
            String fullName,
            long transactionCount,
            double salesAmount,
            double buyOldGoldAmount,
            double salesProfit,
            long unknownCostItemCount
    ) {
    }
}
