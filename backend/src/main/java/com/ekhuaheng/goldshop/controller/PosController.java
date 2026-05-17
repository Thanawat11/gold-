package com.ekhuaheng.goldshop.controller;

import com.ekhuaheng.goldshop.dto.CancelTransactionRequest;
import com.ekhuaheng.goldshop.dto.CheckoutRequest;
import com.ekhuaheng.goldshop.entity.Transaction;
import com.ekhuaheng.goldshop.service.PosService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/pos")
@RequiredArgsConstructor
public class PosController {

    private final PosService posService;

    @PostMapping("/checkout")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','STAFF','CASHIER')")
    public ResponseEntity<Transaction> checkout(@Valid @RequestBody CheckoutRequest request) {
        return ResponseEntity.ok(posService.checkout(request));
    }

    @PostMapping("/transactions/{id}/void")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Transaction> cancelTransaction(@PathVariable Long id, @Valid @RequestBody CancelTransactionRequest request) {
        return ResponseEntity.ok(posService.cancelTransaction(id, request));
    }
}
