package com.ekhuaheng.goldshop.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class BusinessSettingsRequest {
    private BigDecimal gramsPerBaht;
    private BigDecimal wearDeductionPercent;
    private BigDecimal buyFixedDeductionAmount;
    private BigDecimal ownerMaxMakingFeeDiscount;
    private BigDecimal managerMaxMakingFeeDiscount;
    private BigDecimal cashierMaxMakingFeeDiscount;
    private Integer pawnDefaultTermMonths;
    private BigDecimal pawnLoanToValuePercent;
    private BigDecimal pawnSmallTicketInterestRate;
    private BigDecimal pawnStandardTicketInterestRate;
    private BigDecimal pawnSmallTicketLimit;
    private BigDecimal pawnMiddleTicketMin;
    private BigDecimal pawnMonthlyReductionForMiddleTickets;
}
