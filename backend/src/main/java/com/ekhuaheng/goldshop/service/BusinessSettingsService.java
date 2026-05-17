package com.ekhuaheng.goldshop.service;

import com.ekhuaheng.goldshop.config.GoldShopProperties;
import com.ekhuaheng.goldshop.dto.BusinessSettingsRequest;
import com.ekhuaheng.goldshop.entity.SystemSetting;
import com.ekhuaheng.goldshop.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BusinessSettingsService {

    private static final String GRAMS_PER_BAHT = "business.gramsPerBaht";
    private static final String WEAR_DEDUCTION_PERCENT = "business.wearDeductionPercent";
    private static final String BUY_FIXED_DEDUCTION_AMOUNT = "business.buyFixedDeductionAmount";
    private static final String OWNER_MAX_MAKING_FEE_DISCOUNT = "business.ownerMaxMakingFeeDiscount";
    private static final String MANAGER_MAX_MAKING_FEE_DISCOUNT = "business.managerMaxMakingFeeDiscount";
    private static final String CASHIER_MAX_MAKING_FEE_DISCOUNT = "business.cashierMaxMakingFeeDiscount";
    private static final String PAWN_DEFAULT_TERM_MONTHS = "business.pawn.defaultTermMonths";
    private static final String PAWN_LOAN_TO_VALUE_PERCENT = "business.pawn.loanToValuePercent";
    private static final String PAWN_SMALL_TICKET_INTEREST_RATE = "business.pawn.smallTicketInterestRate";
    private static final String PAWN_STANDARD_TICKET_INTEREST_RATE = "business.pawn.standardTicketInterestRate";
    private static final String PAWN_SMALL_TICKET_LIMIT = "business.pawn.smallTicketLimit";
    private static final String PAWN_MIDDLE_TICKET_MIN = "business.pawn.middleTicketMin";
    private static final String PAWN_MONTHLY_REDUCTION_FOR_MIDDLE_TICKETS = "business.pawn.monthlyReductionForMiddleTickets";

    private final GoldShopProperties properties;
    private final SystemSettingRepository settingRepository;

    public Map<String, Object> currentSettings() {
        Map<String, Object> settings = new LinkedHashMap<>();
        settings.put("gramsPerBaht", gramsPerBaht());
        settings.put("wearDeductionPercent", wearDeductionPercent());
        settings.put("buyFixedDeductionAmount", buyFixedDeductionAmount());
        settings.put("ownerMaxMakingFeeDiscount", ownerMaxMakingFeeDiscount());
        settings.put("managerMaxMakingFeeDiscount", managerMaxMakingFeeDiscount());
        settings.put("cashierMaxMakingFeeDiscount", cashierMaxMakingFeeDiscount());
        settings.put("pawnDefaultTermMonths", pawnDefaultTermMonths());
        settings.put("pawnLoanToValuePercent", pawnLoanToValuePercent());
        settings.put("pawnSmallTicketInterestRate", pawnSmallTicketInterestRate());
        settings.put("pawnStandardTicketInterestRate", pawnStandardTicketInterestRate());
        settings.put("pawnSmallTicketLimit", pawnSmallTicketLimit());
        settings.put("pawnMiddleTicketMin", pawnMiddleTicketMin());
        settings.put("pawnMonthlyReductionForMiddleTickets", pawnMonthlyReductionForMiddleTickets());
        return settings;
    }

    @Transactional
    public Map<String, Object> update(BusinessSettingsRequest request) {
        savePositiveDecimal(GRAMS_PER_BAHT, request.getGramsPerBaht(), "กรัมต่อบาททองคำ");
        saveNonNegativeDecimal(WEAR_DEDUCTION_PERCENT, request.getWearDeductionPercent(), "หักค่าสึกหรอ");
        saveNonNegativeDecimal(BUY_FIXED_DEDUCTION_AMOUNT, request.getBuyFixedDeductionAmount(), "หักคงที่ตอนรับซื้อทองเก่า");
        saveNonNegativeDecimal(OWNER_MAX_MAKING_FEE_DISCOUNT, request.getOwnerMaxMakingFeeDiscount(), "เพดานลดค่ากำเหน็จ Owner");
        saveNonNegativeDecimal(MANAGER_MAX_MAKING_FEE_DISCOUNT, request.getManagerMaxMakingFeeDiscount(), "เพดานลดค่ากำเหน็จ Manager");
        saveNonNegativeDecimal(CASHIER_MAX_MAKING_FEE_DISCOUNT, request.getCashierMaxMakingFeeDiscount(), "เพดานลดค่ากำเหน็จ Cashier");
        savePositiveInteger(PAWN_DEFAULT_TERM_MONTHS, request.getPawnDefaultTermMonths(), "อายุตั๋วเริ่มต้น");
        saveNonNegativeDecimal(PAWN_LOAN_TO_VALUE_PERCENT, request.getPawnLoanToValuePercent(), "วงเงินเทียบมูลค่าประเมิน");
        saveNonNegativeDecimal(PAWN_SMALL_TICKET_INTEREST_RATE, request.getPawnSmallTicketInterestRate(), "ดอกเบี้ยตั๋วเล็ก");
        saveNonNegativeDecimal(PAWN_STANDARD_TICKET_INTEREST_RATE, request.getPawnStandardTicketInterestRate(), "ดอกเบี้ยมาตรฐาน");
        savePositiveDecimal(PAWN_SMALL_TICKET_LIMIT, request.getPawnSmallTicketLimit(), "เพดานตั๋วเล็ก");
        saveNonNegativeDecimal(PAWN_MIDDLE_TICKET_MIN, request.getPawnMiddleTicketMin(), "ขั้นต่ำตั๋วกลาง");
        saveNonNegativeDecimal(PAWN_MONTHLY_REDUCTION_FOR_MIDDLE_TICKETS, request.getPawnMonthlyReductionForMiddleTickets(), "ส่วนลดดอกเบี้ยตั๋วกลาง");
        return currentSettings();
    }

    public BigDecimal gramsPerBaht() {
        return decimal(GRAMS_PER_BAHT, properties.getBusiness().getGramsPerBaht());
    }

    public BigDecimal wearDeductionPercent() {
        return decimal(WEAR_DEDUCTION_PERCENT, properties.getBusiness().getOrnamentWearDeductionPercent());
    }

    public BigDecimal buyFixedDeductionAmount() {
        return decimal(BUY_FIXED_DEDUCTION_AMOUNT, properties.getBusiness().getBuyFixedDeductionAmount());
    }

    public BigDecimal ownerMaxMakingFeeDiscount() {
        return decimal(OWNER_MAX_MAKING_FEE_DISCOUNT, properties.getBusiness().getOwnerMaxMakingFeeDiscount());
    }

    public BigDecimal managerMaxMakingFeeDiscount() {
        return decimal(MANAGER_MAX_MAKING_FEE_DISCOUNT, properties.getBusiness().getManagerMaxMakingFeeDiscount());
    }

    public BigDecimal cashierMaxMakingFeeDiscount() {
        return decimal(CASHIER_MAX_MAKING_FEE_DISCOUNT, properties.getBusiness().getCashierMaxMakingFeeDiscount());
    }

    public int pawnDefaultTermMonths() {
        return integer(PAWN_DEFAULT_TERM_MONTHS, properties.getBusiness().getPawn().getDefaultTermMonths());
    }

    public BigDecimal pawnLoanToValuePercent() {
        return decimal(PAWN_LOAN_TO_VALUE_PERCENT, properties.getBusiness().getPawn().getLoanToValuePercent());
    }

    public BigDecimal pawnSmallTicketInterestRate() {
        return decimal(PAWN_SMALL_TICKET_INTEREST_RATE, properties.getBusiness().getPawn().getSmallTicketInterestRate());
    }

    public BigDecimal pawnStandardTicketInterestRate() {
        return decimal(PAWN_STANDARD_TICKET_INTEREST_RATE, properties.getBusiness().getPawn().getStandardTicketInterestRate());
    }

    public BigDecimal pawnSmallTicketLimit() {
        return decimal(PAWN_SMALL_TICKET_LIMIT, properties.getBusiness().getPawn().getSmallTicketLimit());
    }

    public BigDecimal pawnMiddleTicketMin() {
        return decimal(PAWN_MIDDLE_TICKET_MIN, properties.getBusiness().getPawn().getMiddleTicketMin());
    }

    public BigDecimal pawnMonthlyReductionForMiddleTickets() {
        return decimal(PAWN_MONTHLY_REDUCTION_FOR_MIDDLE_TICKETS, properties.getBusiness().getPawn().getMonthlyReductionForMiddleTickets());
    }

    private BigDecimal decimal(String key, BigDecimal defaultValue) {
        return settingRepository.findById(key)
                .map(SystemSetting::getSettingValue)
                .map(BigDecimal::new)
                .orElse(defaultValue);
    }

    private int integer(String key, int defaultValue) {
        return settingRepository.findById(key)
                .map(SystemSetting::getSettingValue)
                .map(Integer::parseInt)
                .orElse(defaultValue);
    }

    private void savePositiveDecimal(String key, BigDecimal value, String label) {
        if (value == null) {
            return;
        }
        if (value.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(label + " ต้องมากกว่า 0");
        }
        save(key, value.stripTrailingZeros().toPlainString());
    }

    private void saveNonNegativeDecimal(String key, BigDecimal value, String label) {
        if (value == null) {
            return;
        }
        if (value.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException(label + " ต้องไม่ติดลบ");
        }
        save(key, value.stripTrailingZeros().toPlainString());
    }

    private void savePositiveInteger(String key, Integer value, String label) {
        if (value == null) {
            return;
        }
        if (value <= 0) {
            throw new IllegalArgumentException(label + " ต้องมากกว่า 0");
        }
        save(key, String.valueOf(value));
    }

    private void save(String key, String value) {
        SystemSetting setting = settingRepository.findById(key)
                .orElse(SystemSetting.builder().settingKey(key).build());
        setting.setSettingValue(value);
        setting.setUpdatedBy(currentUsername());
        settingRepository.save(setting);
    }

    private String currentUsername() {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            return null;
        }
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
