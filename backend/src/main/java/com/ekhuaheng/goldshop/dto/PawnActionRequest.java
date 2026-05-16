package com.ekhuaheng.goldshop.dto;

import com.ekhuaheng.goldshop.entity.PawnActionType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PawnActionRequest {
    @NotNull
    private PawnActionType actionType;
    private Double amountPaid; // For RENEW or REDEEM (Total paid by customer)
    private Double interestPaid;
    private Double principalAdjusted; // Positive if customer pays principal (reduce), negative if shop gives money (add)
    private Integer extendMonths; // For RENEW
    private Double newInterestRate; // Optional manual override
}
