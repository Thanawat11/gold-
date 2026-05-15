package com.ekhuaheng.goldshop.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "pawn_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PawnHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "pawn_ticket_id", nullable = false)
    @JsonIgnore
    private PawnTicket pawnTicket;

    @Column(nullable = false)
    private String actionType; // RENEW, ADD_PRINCIPAL, REDUCE_PRINCIPAL, REDEEM, CREATE

    @Column(nullable = false)
    private Double amountPaid; // Total amount paid by customer (or given to customer if negative/adding principal)

    private Double interestPaid; // Portion that was interest

    private Double principalAdjusted; // Change in principal (positive = customer paid, negative = shop paid)

    private LocalDate previousDueDate;
    private LocalDate newDueDate;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User createdBy;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
