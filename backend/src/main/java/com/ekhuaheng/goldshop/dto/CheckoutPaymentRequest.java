package com.ekhuaheng.goldshop.dto;

import com.ekhuaheng.goldshop.entity.PaymentMethod;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CheckoutPaymentRequest {
    @NotNull
    private PaymentMethod paymentMethod;
    @NotNull
    private Double amount;
    private String referenceNo;
}
