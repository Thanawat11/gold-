package com.ekhuaheng.goldshop.controller;

import com.ekhuaheng.goldshop.dto.PawnTicketRequest;
import com.ekhuaheng.goldshop.entity.PawnTicket;
import com.ekhuaheng.goldshop.service.PawnService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/pawn")
@RequiredArgsConstructor
public class PawnController {

    private final PawnService pawnService;

    @PostMapping("/create")
    public ResponseEntity<?> createTicket(@RequestBody PawnTicketRequest request) {
        try {
            return ResponseEntity.ok(pawnService.createTicket(request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/tickets")
    public ResponseEntity<List<PawnTicket>> getAllTickets() {
        return ResponseEntity.ok(pawnService.getAllTickets());
    }

    @PostMapping("/redeem/{id}")
    public ResponseEntity<?> redeemTicket(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(pawnService.redeemTicket(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/action")
    public ResponseEntity<?> performAction(@PathVariable Long id, @RequestBody com.ekhuaheng.goldshop.dto.PawnActionRequest request) {
        try {
            return ResponseEntity.ok(pawnService.performAction(id, request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<?> getTicketHistory(@PathVariable Long id) {
        return ResponseEntity.ok(pawnService.getTicketHistory(id));
    }

    @GetMapping("/{id}/interest-suggestion")
    public ResponseEntity<?> getInterestSuggestion(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(pawnService.getSuggestedInterest(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/summary")
    public ResponseEntity<?> getSummary() {
        return ResponseEntity.ok(pawnService.getDashboardSummary());
    }
}
