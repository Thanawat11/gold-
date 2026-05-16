package com.ekhuaheng.goldshop.dto;

import com.ekhuaheng.goldshop.entity.TransactionItemType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CheckoutItemRequest {
    private Long productId;
    @NotNull
    private TransactionItemType itemType;
    @NotNull
    private Double price;
    private Double fee;
}
