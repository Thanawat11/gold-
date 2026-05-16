package com.ekhuaheng.goldshop.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PriceQuoteRequest {
    @NotNull
    private Double weightGram;
    private Double goldPricePerBaht;
    private Double makingFee;
    private Double makingFeeDiscount;
    private Double wearDeductionPercent;
    private Double overrideAmount;
    private String tradeInPolicy;
    private Double newItemTotal;
    private Double oldItemBuyPrice;
    private Double principal;
    private Double monthlyInterestRate;
    private Double months;
}
