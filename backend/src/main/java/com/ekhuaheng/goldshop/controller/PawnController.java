package com.ekhuaheng.goldshop.controller;

import com.ekhuaheng.goldshop.dto.PawnEstimateRequest;
import com.ekhuaheng.goldshop.dto.PawnTicketRequest;
import com.ekhuaheng.goldshop.entity.PawnTicket;
import com.ekhuaheng.goldshop.service.PawnService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/pawn")
@RequiredArgsConstructor
public class PawnController {

    private final PawnService pawnService;

    @PostMapping("/estimate")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','STAFF','CASHIER')")
    public ResponseEntity<?> estimate(@Valid @RequestBody PawnEstimateRequest request) {
        return ResponseEntity.ok(pawnService.estimate(request));
    }

    @PostMapping("/create")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','STAFF','CASHIER')")
    public ResponseEntity<PawnTicket> createTicket(@Valid @RequestBody PawnTicketRequest request) {
        return ResponseEntity.ok(pawnService.createTicket(request));
    }

    @GetMapping("/tickets")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','STAFF','CASHIER')")
    public ResponseEntity<List<PawnTicket>> getAllTickets() {
        return ResponseEntity.ok(pawnService.getAllTickets());
    }

    @PostMapping("/redeem/{id}")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER')")
    public ResponseEntity<PawnTicket> redeemTicket(@PathVariable Long id) {
        return ResponseEntity.ok(pawnService.redeemTicket(id));
    }

    @PostMapping("/{id}/action")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER')")
    public ResponseEntity<PawnTicket> performAction(@PathVariable Long id, @Valid @RequestBody com.ekhuaheng.goldshop.dto.PawnActionRequest request) {
        return ResponseEntity.ok(pawnService.performAction(id, request));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','STAFF','CASHIER')")
    public ResponseEntity<?> getTicketHistory(@PathVariable Long id) {
        return ResponseEntity.ok(pawnService.getTicketHistory(id));
    }

    @GetMapping("/{id}/interest-suggestion")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','STAFF','CASHIER')")
    public ResponseEntity<?> getInterestSuggestion(@PathVariable Long id) {
        return ResponseEntity.ok(pawnService.getSuggestedInterest(id));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','STAFF','CASHIER')")
    public ResponseEntity<?> getSummary() {
        return ResponseEntity.ok(pawnService.getDashboardSummary());
    }
}
