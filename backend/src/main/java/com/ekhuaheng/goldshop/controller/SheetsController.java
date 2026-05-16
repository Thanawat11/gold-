package com.ekhuaheng.goldshop.controller;

import com.ekhuaheng.goldshop.config.SheetNames;
import com.ekhuaheng.goldshop.service.GoogleSheetsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/sheets")
@RequiredArgsConstructor
public class SheetsController {

    private final GoogleSheetsService sheetsService;

    @GetMapping("/pawnable-items")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','CASHIER')")
    public ResponseEntity<List<Map<String, Object>>> getPawnableItems() {
        List<Map<String, Object>> items = sheetsService.getData(SheetNames.PAWNABLE_ITEMS);
        return ResponseEntity.ok(items);
    }

    @GetMapping("/template")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER')")
    public ResponseEntity<?> template() {
        return ResponseEntity.ok(Map.of(
                SheetNames.USERS, List.of("username", "password", "fullName", "role"),
                SheetNames.PRODUCTS, List.of("id", "barcode", "name", "category", "weightGram", "weightText", "status"),
                SheetNames.CUSTOMERS, List.of("id", "fullName", "phone", "idCard"),
                SheetNames.PAWN_TICKETS, List.of("id", "customer", "product", "principal", "interestRate", "pawnDate", "dueDate", "status"),
                SheetNames.PAWN_HISTORY, List.of("id", "ticketId", "actionType", "amountPaid", "interestPaid", "createdAt"),
                SheetNames.TRANSACTIONS, List.of("id", "receiptNumber", "transactionType", "netAmount", "paymentMethod"),
                SheetNames.PAWNABLE_ITEMS, List.of("id", "name", "category")
        ));
    }
}
