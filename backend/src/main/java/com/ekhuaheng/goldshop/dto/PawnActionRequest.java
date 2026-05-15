package com.ekhuaheng.goldshop.dto;

import lombok.Data;

@Data
public class PawnActionRequest {
    private String actionType; // RENEW, ADJUST_PRINCIPAL, REDEEM
    private Double amountPaid; // For RENEW or REDEEM (Total paid by customer)
    private Double interestPaid;
    private Double principalAdjusted; // Positive if customer pays principal (reduce), negative if shop gives money (add)
    private Integer extendMonths; // For RENEW
    private Double newInterestRate; // Optional manual override
}
