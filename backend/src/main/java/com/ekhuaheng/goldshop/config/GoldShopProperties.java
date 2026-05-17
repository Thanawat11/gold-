package com.ekhuaheng.goldshop.config;

import com.ekhuaheng.goldshop.entity.Role;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Data
@ConfigurationProperties(prefix = "goldshop")
public class GoldShopProperties {

    private Cors cors = new Cors();
    private Seed seed = new Seed();
    private GoogleSheets googleSheets = new GoogleSheets();
    private GoldPrice goldPrice = new GoldPrice();
    private Business business = new Business();
    private DocumentNumbers documentNumbers = new DocumentNumbers();

    @Data
    public static class Cors {
        private List<String> allowedOrigins = new ArrayList<>();
    }

    @Data
    public static class Seed {
        private Admin admin = new Admin();

        @Data
        public static class Admin {
            private boolean enabled;
            private String username;
            private String password;
            private String fullName;
            private Role role = Role.OWNER;
        }
    }
    

    @Data
    public static class GoogleSheets {
        private boolean enabled;
        private String webAppUrl;
        private Duration timeout = Duration.ofSeconds(10);
    }

    @Data
    public static class GoldPrice {
        private String sourceUrl;
        private Duration refreshInterval = Duration.ofMinutes(5);
        private Duration sourceTimeout = Duration.ofSeconds(10);
    }

    @Data
    public static class Business {
        private BigDecimal gramsPerBaht = new BigDecimal("15.16");
        private BigDecimal ornamentWearDeductionPercent = new BigDecimal("5.00");
        private BigDecimal buyFixedDeductionAmount = new BigDecimal("200.00");
        private BigDecimal ownerMaxMakingFeeDiscount = new BigDecimal("999999");
        private BigDecimal managerMaxMakingFeeDiscount = new BigDecimal("1000");
        private BigDecimal cashierMaxMakingFeeDiscount = new BigDecimal("300");
        private Pawn pawn = new Pawn();

        @Data
        public static class Pawn {
            private int defaultTermMonths = 5;
            private BigDecimal loanToValuePercent = new BigDecimal("85.00");
            private BigDecimal smallTicketInterestRate = new BigDecimal("2.00");
            private BigDecimal standardTicketInterestRate = new BigDecimal("1.25");
            private BigDecimal smallTicketLimit = new BigDecimal("9999");
            private BigDecimal monthlyReductionForMiddleTickets = new BigDecimal("20.00");
            private BigDecimal middleTicketMin = new BigDecimal("7000");
        }
    }

    @Data
    public static class DocumentNumbers {
        private String receiptPrefix;
        private String pawnTicketPrefix;
        private String productBarcodePrefix;
    }
}
