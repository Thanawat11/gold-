package com.ekhuaheng.goldshop.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PriceQuoteResponse {
    private Double goldAmount;
    private Double feeAmount;
    private Double discountAmount;
    private Double deductionAmount;
    private Double netAmount;
    private String formula;
}
