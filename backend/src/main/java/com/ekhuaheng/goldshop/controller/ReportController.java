package com.ekhuaheng.goldshop.controller;

import com.ekhuaheng.goldshop.dto.OwnerReportResponse;
import com.ekhuaheng.goldshop.entity.ProductStatus;
import com.ekhuaheng.goldshop.repository.ProductRepository;
import com.ekhuaheng.goldshop.repository.TransactionRepository;
import com.ekhuaheng.goldshop.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
    private final ReportService reportService;

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

    @GetMapping("/owner")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','ACCOUNT')")
    public OwnerReportResponse ownerReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "DAILY") String period
    ) {
        return reportService.ownerReport(from, to, period);
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

    @GetMapping(value = "/owner.csv", produces = "text/csv")
    @PreAuthorize("hasAnyRole('OWNER','ACCOUNT')")
    public ResponseEntity<String> ownerCsv(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "DAILY") String period
    ) {
        OwnerReportResponse report = reportService.ownerReport(from, to, period);
        StringBuilder csv = new StringBuilder();
        csv.append("section,label,value\n");
        csv.append(csvLine("summary", "fromDate", report.fromDate()));
        csv.append(csvLine("summary", "toDate", report.toDate()));
        csv.append(csvLine("summary", "period", report.period()));
        csv.append(csvLine("summary", "transactionCount", report.totals().transactionCount()));
        csv.append(csvLine("summary", "revenueAmount", report.totals().revenueAmount()));
        csv.append(csvLine("summary", "salesAmount", report.totals().salesAmount()));
        csv.append(csvLine("summary", "buyOldGoldAmount", report.totals().buyOldGoldAmount()));
        csv.append(csvLine("summary", "salesProfit", report.totals().salesProfit()));
        csv.append(csvLine("summary", "estimatedNetProfit", report.totals().estimatedNetProfit()));
        csv.append(csvLine("summary", "cashInAmount", report.totals().cashInAmount()));
        csv.append(csvLine("summary", "cashOutAmount", report.totals().cashOutAmount()));
        csv.append(csvLine("summary", "netCashAmount", report.totals().netCashAmount()));
        csv.append(csvLine("summary", "interestIncome", report.totals().interestIncome()));
        csv.append(csvLine("summary", "activePawnPrincipal", report.totals().activePawnPrincipal()));
        csv.append(csvLine("summary", "availableStockWeightGram", report.totals().availableStockWeightGram()));
        csv.append(csvLine("summary", "availableStockGoldBaht", report.totals().availableStockGoldBaht()));
        csv.append('\n');

        csv.append("period,transactionCount,revenueAmount,salesAmount,buyOldGoldAmount,salesProfit,estimatedNetProfit,cashInAmount,cashOutAmount,interestIncome\n");
        report.periodRows().forEach(row -> csv.append(csvLine(
                row.periodKey(),
                row.transactionCount(),
                row.revenueAmount(),
                row.salesAmount(),
                row.buyOldGoldAmount(),
                row.salesProfit(),
                row.estimatedNetProfit(),
                row.cashInAmount(),
                row.cashOutAmount(),
                row.interestIncome()
        )));
        csv.append('\n');

        csv.append("employee,transactionCount,salesAmount,buyOldGoldAmount,salesProfit,unknownCostItemCount\n");
        report.employeeSalesRows().forEach(row -> csv.append(csvLine(
                row.fullName(),
                row.transactionCount(),
                row.salesAmount(),
                row.buyOldGoldAmount(),
                row.salesProfit(),
                row.unknownCostItemCount()
        )));

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=owner-report.csv")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv.toString());
    }

    @GetMapping(value = "/owner.xls", produces = "application/vnd.ms-excel")
    @PreAuthorize("hasAnyRole('OWNER','ACCOUNT')")
    public ResponseEntity<String> ownerExcel(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "DAILY") String period
    ) {
        OwnerReportResponse report = reportService.ownerReport(from, to, period);
        String html = """
                <html><head><meta charset="UTF-8"></head><body>
                <h2>Owner Report</h2>
                <table border="1">
                <tr><th>From</th><th>To</th><th>Period</th><th>Revenue</th><th>Estimated Net Profit</th><th>Sales</th><th>Cash In</th><th>Cash Out</th><th>Net Cash</th><th>Tax Base</th><th>VAT</th></tr>
                <tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>
                </table>
                <h3>Period Summary</h3>
                <table border="1">
                <tr><th>Period</th><th>Revenue</th><th>Estimated Net Profit</th><th>Sales</th><th>Interest</th><th>Cash In</th><th>Cash Out</th></tr>
                %s
                </table>
                <h3>Transactions</h3>
                <table border="1">
                <tr><th>Date</th><th>Receipt</th><th>Type</th><th>Status</th><th>Customer</th><th>Cashier</th><th>Net</th><th>Cash In</th><th>Cash Out</th><th>Cancel Reason</th></tr>
                %s
                </table>
                <h3>Pawn Outstanding</h3>
                <table border="1">
                <tr><th>Ticket</th><th>Customer</th><th>Product</th><th>Weight Gram</th><th>Principal</th><th>Due Date</th></tr>
                %s
                </table>
                <h3>Inventory By Weight</h3>
                <table border="1">
                <tr><th>Weight</th><th>Count</th><th>Weight Gram</th><th>Cost</th></tr>
                %s
                </table>
                </body></html>
                """.formatted(
                html(report.fromDate()),
                html(report.toDate()),
                html(report.period()),
                report.totals().revenueAmount(),
                report.totals().estimatedNetProfit(),
                report.totals().salesAmount(),
                report.totals().cashInAmount(),
                report.totals().cashOutAmount(),
                report.totals().netCashAmount(),
                report.totals().taxBaseAmount(),
                report.totals().vatAmount(),
                periodHtmlRows(report),
                transactionHtmlRows(report),
                pawnHtmlRows(report),
                inventoryWeightHtmlRows(report)
        );

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=owner-report.xls")
                .contentType(MediaType.parseMediaType("application/vnd.ms-excel; charset=UTF-8"))
                .body(html);
    }

    private String csvLine(Object... values) {
        StringBuilder line = new StringBuilder();
        for (int i = 0; i < values.length; i++) {
            if (i > 0) {
                line.append(',');
            }
            line.append(csvCell(values[i]));
        }
        return line.append('\n').toString();
    }

    private String csvCell(Object value) {
        String text = value == null ? "" : String.valueOf(value);
        if (text.contains(",") || text.contains("\"") || text.contains("\n")) {
            return "\"" + text.replace("\"", "\"\"") + "\"";
        }
        return text;
    }

    private String transactionHtmlRows(OwnerReportResponse report) {
        StringBuilder rows = new StringBuilder();
        report.transactionRows().forEach(row -> rows.append("<tr><td>")
                .append(html(row.transactionDate())).append("</td><td>")
                .append(html(row.receiptNumber())).append("</td><td>")
                .append(html(row.transactionType())).append("</td><td>")
                .append(html(row.status())).append("</td><td>")
                .append(html(row.customerName())).append("</td><td>")
                .append(html(row.cashierName())).append("</td><td>")
                .append(row.netAmount()).append("</td><td>")
                .append(row.cashInAmount()).append("</td><td>")
                .append(row.cashOutAmount()).append("</td><td>")
                .append(html(row.cancelReason())).append("</td></tr>"));
        return rows.toString();
    }

    private String periodHtmlRows(OwnerReportResponse report) {
        StringBuilder rows = new StringBuilder();
        report.periodRows().forEach(row -> rows.append("<tr><td>")
                .append(html(row.periodKey())).append("</td><td>")
                .append(row.revenueAmount()).append("</td><td>")
                .append(row.estimatedNetProfit()).append("</td><td>")
                .append(row.salesAmount()).append("</td><td>")
                .append(row.interestIncome()).append("</td><td>")
                .append(row.cashInAmount()).append("</td><td>")
                .append(row.cashOutAmount()).append("</td></tr>"));
        return rows.toString();
    }

    private String pawnHtmlRows(OwnerReportResponse report) {
        StringBuilder rows = new StringBuilder();
        report.pawn().outstandingTickets().forEach(row -> rows.append("<tr><td>")
                .append(html(row.ticketNumber())).append("</td><td>")
                .append(html(row.customerName())).append("</td><td>")
                .append(html(row.productName())).append("</td><td>")
                .append(row.weightGram()).append("</td><td>")
                .append(row.principalAmount()).append("</td><td>")
                .append(html(row.dueDate())).append("</td></tr>"));
        return rows.toString();
    }

    private String inventoryWeightHtmlRows(OwnerReportResponse report) {
        StringBuilder rows = new StringBuilder();
        report.inventory().byWeight().forEach(row -> rows.append("<tr><td>")
                .append(html(row.weightLabel())).append("</td><td>")
                .append(row.count()).append("</td><td>")
                .append(row.weightGram()).append("</td><td>")
                .append(row.costAmount()).append("</td></tr>"));
        return rows.toString();
    }

    private String html(Object value) {
        String text = value == null ? "" : String.valueOf(value);
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
