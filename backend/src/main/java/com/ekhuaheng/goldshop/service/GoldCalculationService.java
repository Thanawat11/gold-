package com.ekhuaheng.goldshop.service;

import com.ekhuaheng.goldshop.config.GoldShopProperties;
import com.ekhuaheng.goldshop.dto.PriceQuoteRequest;
import com.ekhuaheng.goldshop.dto.PriceQuoteResponse;
import com.ekhuaheng.goldshop.entity.Role;
import com.ekhuaheng.goldshop.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class GoldCalculationService {

    private static final int MONEY_SCALE = 2;

    private final GoldShopProperties properties;

    public PriceQuoteResponse sell(PriceQuoteRequest request) {
        BigDecimal weightGram = valueOf(request.getWeightGram());
        BigDecimal goldPricePerBaht = valueOf(request.getGoldPricePerBaht());
        BigDecimal makingFee = valueOf(request.getMakingFee());
        BigDecimal discount = capDiscount(valueOf(request.getMakingFeeDiscount()));
        BigDecimal goldAmount = weightGram.multiply(pricePerGram(goldPricePerBaht));
        BigDecimal netAmount = goldAmount.add(makingFee).subtract(discount);

        return PriceQuoteResponse.builder()
                .goldAmount(money(goldAmount))
                .feeAmount(money(makingFee))
                .discountAmount(money(discount))
                .deductionAmount(0.0)
                .netAmount(money(netAmount))
                .formula("SELLING_PRICE")
                .build();
    }

    public PriceQuoteResponse buy(PriceQuoteRequest request) {
        BigDecimal weightGram = valueOf(request.getWeightGram());
        BigDecimal buyPricePerBaht = valueOf(request.getGoldPricePerBaht());
        BigDecimal deductionPercent = request.getWearDeductionPercent() == null
                ? properties.getBusiness().getOrnamentWearDeductionPercent()
                : valueOf(request.getWearDeductionPercent());
        BigDecimal goldAmount = weightGram.multiply(pricePerGram(buyPricePerBaht));
        BigDecimal deduction = goldAmount.multiply(deductionPercent)
                .divide(BigDecimal.valueOf(100), MONEY_SCALE, RoundingMode.HALF_UP);
        BigDecimal netAmount = request.getOverrideAmount() == null
                ? goldAmount.subtract(deduction)
                : valueOf(request.getOverrideAmount());

        return PriceQuoteResponse.builder()
                .goldAmount(money(goldAmount))
                .feeAmount(0.0)
                .discountAmount(0.0)
                .deductionAmount(money(deduction))
                .netAmount(money(netAmount))
                .formula("BUYING_PRICE")
                .build();
    }

    public PriceQuoteResponse tradeIn(PriceQuoteRequest request) {
        BigDecimal newItemTotal = valueOf(request.getNewItemTotal());
        BigDecimal oldItemBuyPrice = valueOf(request.getOldItemBuyPrice());
        BigDecimal netAmount = newItemTotal.subtract(oldItemBuyPrice);

        return PriceQuoteResponse.builder()
                .goldAmount(money(newItemTotal))
                .feeAmount(0.0)
                .discountAmount(0.0)
                .deductionAmount(0.0)
                .netAmount(money(netAmount.max(BigDecimal.ZERO)))
                .formula(request.getTradeInPolicy() == null ? "FULL_DIFFERENCE" : request.getTradeInPolicy())
                .build();
    }

    public PriceQuoteResponse pawnInterest(PriceQuoteRequest request) {
        BigDecimal principal = valueOf(request.getPrincipal());
        BigDecimal months = valueOf(request.getMonths());
        BigDecimal monthlyRate = request.getMonthlyInterestRate() == null
                ? pawnInterestRate(principal)
                : valueOf(request.getMonthlyInterestRate());
        BigDecimal interest = principal.multiply(monthlyRate)
                .divide(BigDecimal.valueOf(100), MONEY_SCALE, RoundingMode.HALF_UP)
                .multiply(months);

        return PriceQuoteResponse.builder()
                .goldAmount(money(principal))
                .feeAmount(money(interest))
                .discountAmount(0.0)
                .deductionAmount(0.0)
                .netAmount(money(principal.add(interest)))
                .formula("PAWN_INTEREST")
                .build();
    }

    public BigDecimal pawnInterestRate(BigDecimal principal) {
        GoldShopProperties.Business.Pawn pawn = properties.getBusiness().getPawn();
        if (principal.compareTo(pawn.getSmallTicketLimit()) <= 0) {
            return pawn.getSmallTicketInterestRate();
        }
        return pawn.getStandardTicketInterestRate();
    }

    public BigDecimal pricePerGram(BigDecimal pricePerBaht) {
        return pricePerBaht.divide(properties.getBusiness().getGramsPerBaht(), 8, RoundingMode.HALF_UP);
    }

    private BigDecimal capDiscount(BigDecimal requestedDiscount) {
        BigDecimal allowed = switch (currentRole()) {
            case OWNER -> properties.getBusiness().getOwnerMaxMakingFeeDiscount();
            case MANAGER -> properties.getBusiness().getManagerMaxMakingFeeDiscount();
            case CASHIER -> properties.getBusiness().getCashierMaxMakingFeeDiscount();
        };
        return requestedDiscount.min(allowed);
    }

    private Role currentRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user.getRole();
        }
        return Role.CASHIER;
    }

    private BigDecimal valueOf(Double value) {
        return value == null ? BigDecimal.ZERO : BigDecimal.valueOf(value);
    }

    private Double money(BigDecimal value) {
        return value.setScale(MONEY_SCALE, RoundingMode.HALF_UP).doubleValue();
    }
}
