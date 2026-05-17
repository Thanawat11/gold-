package com.ekhuaheng.goldshop.service;

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

    private final BusinessSettingsService settingsService;

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
                ? settingsService.wearDeductionPercent()
                : valueOf(request.getWearDeductionPercent());
        BigDecimal fixedDeduction = request.getFixedDeductionAmount() == null
                ? settingsService.buyFixedDeductionAmount()
                : valueOf(request.getFixedDeductionAmount());
        BigDecimal goldAmount = weightGram.multiply(pricePerGram(buyPricePerBaht));
        BigDecimal percentDeduction = goldAmount.multiply(deductionPercent)
                .divide(BigDecimal.valueOf(100), MONEY_SCALE, RoundingMode.HALF_UP);
        BigDecimal deduction = percentDeduction.add(fixedDeduction).max(BigDecimal.ZERO);
        BigDecimal netAmount = request.getOverrideAmount() == null
                ? goldAmount.subtract(deduction).max(BigDecimal.ZERO)
                : valueOf(request.getOverrideAmount());

        return PriceQuoteResponse.builder()
                .goldAmount(money(goldAmount))
                .feeAmount(0.0)
                .discountAmount(0.0)
                .deductionAmount(money(deduction))
                .netAmount(money(netAmount))
                .formula("BUYING_PRICE_WITH_FIXED_DEDUCTION")
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
        if (principal.compareTo(settingsService.pawnSmallTicketLimit()) <= 0) {
            return settingsService.pawnSmallTicketInterestRate();
        }
        return settingsService.pawnStandardTicketInterestRate();
    }

    public BigDecimal pricePerGram(BigDecimal pricePerBaht) {
        return pricePerBaht.divide(settingsService.gramsPerBaht(), 8, RoundingMode.HALF_UP);
    }

    private BigDecimal capDiscount(BigDecimal requestedDiscount) {
        BigDecimal allowed = switch (currentRole()) {
            case OWNER -> settingsService.ownerMaxMakingFeeDiscount();
            case MANAGER -> settingsService.managerMaxMakingFeeDiscount();
            case STAFF, CASHIER -> settingsService.cashierMaxMakingFeeDiscount();
            case ACCOUNT -> BigDecimal.ZERO;
        };
        return requestedDiscount.min(allowed);
    }

    private Role currentRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user.getRole();
        }
        return Role.STAFF;
    }

    private BigDecimal valueOf(Double value) {
        return value == null ? BigDecimal.ZERO : BigDecimal.valueOf(value);
    }

    private Double money(BigDecimal value) {
        return value.setScale(MONEY_SCALE, RoundingMode.HALF_UP).doubleValue();
    }
}
