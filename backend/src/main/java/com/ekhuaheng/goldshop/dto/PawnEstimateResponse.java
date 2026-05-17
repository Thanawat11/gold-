package com.ekhuaheng.goldshop.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class PawnEstimateResponse {
    private Double goldPricePerBaht;
    private Double rawGoldValue;
    private Double wearDeductionAmount;
    private Double appraisedValue;
    private Double loanToValuePercent;
    private Double recommendedPrincipal;
    private Double selectedPrincipal;
    private Double monthlyInterestRate;
    private Double monthlyInterestAmount;
    private Integer defaultTermMonths;
    private LocalDate defaultDueDate;
    private String formula;
}
