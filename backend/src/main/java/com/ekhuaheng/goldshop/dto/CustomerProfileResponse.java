package com.ekhuaheng.goldshop.dto;

import com.ekhuaheng.goldshop.entity.Customer;
import com.ekhuaheng.goldshop.entity.PawnStatus;
import com.ekhuaheng.goldshop.entity.PaymentMethod;
import com.ekhuaheng.goldshop.entity.TransactionType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class CustomerProfileResponse {
    private Customer customer;
    private List<TransactionHistoryItem> purchaseHistory;
    private List<TransactionHistoryItem> goldSaleHistory;
    private List<PawnTicketHistoryItem> pawnHistory;
    private Double totalPurchaseAmount;
    private Double totalGoldSaleAmount;
    private Double activePawnPrincipal;

    @Data
    @Builder
    public static class TransactionHistoryItem {
        private Long id;
        private String receiptNumber;
        private TransactionType transactionType;
        private Double netAmount;
        private PaymentMethod paymentMethod;
        private LocalDateTime transactionDate;
        private Integer itemCount;
    }

    @Data
    @Builder
    public static class PawnTicketHistoryItem {
        private Long id;
        private String ticketNumber;
        private String productName;
        private Double principalAmount;
        private Double interestRate;
        private LocalDate pawnDate;
        private LocalDate dueDate;
        private PawnStatus status;
    }
}
