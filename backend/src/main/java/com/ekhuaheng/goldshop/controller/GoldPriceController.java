package com.ekhuaheng.goldshop.controller;

import com.ekhuaheng.goldshop.service.GoldPriceService;
import com.ekhuaheng.goldshop.dto.GoldPriceUpdateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/gold-price")
@RequiredArgsConstructor
public class GoldPriceController {

    private final GoldPriceService goldPriceService;

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','CASHIER')")
    public ResponseEntity<?> getGoldPrice() {
        return ResponseEntity.ok(goldPriceService.getGoldPrice());
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('OWNER','MANAGER')")
    public ResponseEntity<?> updateGoldPrice(@Valid @RequestBody GoldPriceUpdateRequest request) {
        return ResponseEntity.ok(goldPriceService.updateManualPrice(request));
    }

    @GetMapping("/history")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','CASHIER')")
    public ResponseEntity<?> getGoldPriceHistory() {
        return ResponseEntity.ok(goldPriceService.getPriceHistory());
    }
}
