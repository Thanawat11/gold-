package com.ekhuaheng.goldshop.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GoldPriceResponse {
    private PriceDetail bar;
    private PriceDetail ornament;
    private String updateTime;

    @Data
    @Builder
    public static class PriceDetail {
        private String buy;
        private String sell;
    }
}
