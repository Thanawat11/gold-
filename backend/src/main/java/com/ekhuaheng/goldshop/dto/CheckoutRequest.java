package com.ekhuaheng.goldshop.dto;

import lombok.Data;
import java.util.List;

@Data
public class CheckoutRequest {
    private Long customerId;
    private List<CheckoutItemRequest> items;
    private String transactionType; // SELL, BUY, TRADE_IN
    private Double totalAmount;
    private Double discount;
    private Double netAmount;
    private String paymentMethod; // CASH, TRANSFER, CREDIT_CARD
}
