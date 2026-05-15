package com.ekhuaheng.goldshop.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "pawn_tickets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PawnTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String ticketNumber;

    @ManyToOne
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    private Product product; // ทองที่ลูกค้านำมาจำนำ (จะถูกเปลี่ยนสถานะเป็น PAWNED)

    @Column(nullable = false)
    private Double principalAmount; // เงินต้น

    @Column(nullable = false)
    private Double interestRate; // อัตราดอกเบี้ยต่อเดือน (%)

    @Column(nullable = false)
    private LocalDate pawnDate; // วันที่จำนำ

    @Column(nullable = false)
    private LocalDate dueDate; // วันที่ครบกำหนด

    @Column(nullable = false)
    private String status; // ACTIVE, REDEEMED, EXPIRED

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User createdBy;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (this.ticketNumber == null) {
            this.ticketNumber = "PWN" + System.currentTimeMillis();
        }
    }
}
