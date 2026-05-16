package com.ekhuaheng.goldshop.controller;

import com.ekhuaheng.goldshop.dto.PriceQuoteRequest;
import com.ekhuaheng.goldshop.dto.PriceQuoteResponse;
import com.ekhuaheng.goldshop.service.GoldCalculationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pricing")
@RequiredArgsConstructor
public class PricingController {

    private final GoldCalculationService calculationService;

    @PostMapping("/sell")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','CASHIER')")
    public ResponseEntity<PriceQuoteResponse> sell(@Valid @RequestBody PriceQuoteRequest request) {
        return ResponseEntity.ok(calculationService.sell(request));
    }

    @PostMapping("/buy")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','CASHIER')")
    public ResponseEntity<PriceQuoteResponse> buy(@Valid @RequestBody PriceQuoteRequest request) {
        return ResponseEntity.ok(calculationService.buy(request));
    }

    @PostMapping("/trade-in")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','CASHIER')")
    public ResponseEntity<PriceQuoteResponse> tradeIn(@Valid @RequestBody PriceQuoteRequest request) {
        return ResponseEntity.ok(calculationService.tradeIn(request));
    }

    @PostMapping("/pawn-interest")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','CASHIER')")
    public ResponseEntity<PriceQuoteResponse> pawnInterest(@Valid @RequestBody PriceQuoteRequest request) {
        return ResponseEntity.ok(calculationService.pawnInterest(request));
    }
}
