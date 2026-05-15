package com.ekhuaheng.goldshop.dto;

import lombok.Data;

@Data
public class CheckoutItemRequest {
    private Long productId;
    private String itemType; // SELL, BUY
    private Double price;
    private Double fee;
}
