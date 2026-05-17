package com.ekhuaheng.goldshop.controller;

import com.ekhuaheng.goldshop.dto.BusinessSettingsRequest;
import com.ekhuaheng.goldshop.service.AuditLogService;
import com.ekhuaheng.goldshop.service.BusinessSettingsService;
import com.ekhuaheng.goldshop.service.GoogleSheetsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/system")
@RequiredArgsConstructor
public class SystemController {

    private final BusinessSettingsService businessSettingsService;
    private final GoogleSheetsService sheetsService;
    private final AuditLogService auditLogService;

    @GetMapping("/settings")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','STAFF','ACCOUNT','CASHIER')")
    public ResponseEntity<?> settings() {
        Map<String, Object> settings = new LinkedHashMap<>(businessSettingsService.currentSettings());
        settings.put("googleSheetsEnabled", sheetsService.isEnabled());
        return ResponseEntity.ok(settings);
    }

    @PutMapping("/settings")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<?> updateSettings(@RequestBody BusinessSettingsRequest request) {
        Map<String, Object> settings = new LinkedHashMap<>(businessSettingsService.update(request));
        settings.put("googleSheetsEnabled", sheetsService.isEnabled());
        auditLogService.record("UPDATE_SYSTEM_SETTINGS", "SystemSettings", "business", "Updated business calculation settings");
        return ResponseEntity.ok(settings);
    }

    @GetMapping("/audit-logs")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER')")
    public ResponseEntity<?> auditLogs() {
        return ResponseEntity.ok(auditLogService.recent());
    }
}
