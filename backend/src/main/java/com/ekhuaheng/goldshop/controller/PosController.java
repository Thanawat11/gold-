package com.ekhuaheng.goldshop.controller;

import com.ekhuaheng.goldshop.dto.CheckoutRequest;
import com.ekhuaheng.goldshop.entity.Transaction;
import com.ekhuaheng.goldshop.service.PosService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/pos")
@RequiredArgsConstructor
public class PosController {

    private final PosService posService;

    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(@RequestBody CheckoutRequest request) {
        try {
            Transaction result = posService.checkout(request);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
