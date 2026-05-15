package com.ekhuaheng.goldshop.controller;

import com.ekhuaheng.goldshop.service.GoldPriceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/gold-price")
@RequiredArgsConstructor
public class GoldPriceController {

    private final GoldPriceService goldPriceService;

    @GetMapping
    public ResponseEntity<?> getGoldPrice() {
        return ResponseEntity.ok(goldPriceService.getGoldPrice());
    }

    @GetMapping("/history")
    public ResponseEntity<?> getGoldPriceHistory() {
        return ResponseEntity.ok(goldPriceService.getPriceHistory());
    }
}
