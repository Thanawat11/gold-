package com.ekhuaheng.goldshop.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GoldPriceUpdateRequest {
    @NotNull
    private Double barBuyPrice;
    @NotNull
    private Double barSellPrice;
}
