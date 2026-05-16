package com.ekhuaheng.goldshop.controller;

import com.ekhuaheng.goldshop.config.GoldShopProperties;
import com.ekhuaheng.goldshop.service.AuditLogService;
import com.ekhuaheng.goldshop.service.GoogleSheetsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/system")
@RequiredArgsConstructor
public class SystemController {

    private final GoldShopProperties properties;
    private final GoogleSheetsService sheetsService;
    private final AuditLogService auditLogService;

    @GetMapping("/settings")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','CASHIER')")
    public ResponseEntity<?> settings() {
        return ResponseEntity.ok(Map.of(
                "gramsPerBaht", properties.getBusiness().getGramsPerBaht(),
                "wearDeductionPercent", properties.getBusiness().getOrnamentWearDeductionPercent(),
                "pawnDefaultTermMonths", properties.getBusiness().getPawn().getDefaultTermMonths(),
                "cashierMaxMakingFeeDiscount", properties.getBusiness().getCashierMaxMakingFeeDiscount(),
                "managerMaxMakingFeeDiscount", properties.getBusiness().getManagerMaxMakingFeeDiscount(),
                "googleSheetsEnabled", sheetsService.isEnabled()
        ));
    }

    @GetMapping("/audit-logs")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER')")
    public ResponseEntity<?> auditLogs() {
        return ResponseEntity.ok(auditLogService.recent());
    }
}
