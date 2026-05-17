package com.ekhuaheng.goldshop.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PawnEstimateRequest {
    @NotNull
    @DecimalMin(value = "0.01", message = "น้ำหนักทองต้องมากกว่า 0")
    private Double weightGram;
    private Double goldPricePerBaht;
    private Double wearDeductionPercent;
    private Double loanToValuePercent;
    private Double principalAmount;
}
