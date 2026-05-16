package com.ekhuaheng.goldshop.dto;

import com.ekhuaheng.goldshop.entity.PaymentMethod;
import com.ekhuaheng.goldshop.entity.TransactionType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;

@Data
public class CheckoutRequest {
    private Long customerId;
    @Valid
    @NotEmpty
    private List<CheckoutItemRequest> items;
    @NotNull
    private TransactionType transactionType;
    private Double totalAmount;
    private Double discount;
    private Double netAmount;
    @NotNull
    private PaymentMethod paymentMethod;
}
