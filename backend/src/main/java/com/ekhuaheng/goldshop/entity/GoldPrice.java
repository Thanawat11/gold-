package com.ekhuaheng.goldshop.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "gold_prices")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GoldPrice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Double buyPrice; // ราคารับซื้อเข้า (ต่อ 1 บาททองคำ)

    @Column(nullable = false)
    private Double sellPrice; // ราคาขายออก (ต่อ 1 บาททองคำ)

    private Double ornamentBuyPrice; // ราคารับซื้อทองรูปพรรณ

    private Double ornamentSellPrice; // ราคาขายออกทองรูปพรรณ

    @Column(nullable = false, updatable = false)
    private LocalDateTime effectiveDate;

    @ManyToOne
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    @PrePersist
    protected void onCreate() {
        effectiveDate = LocalDateTime.now();
    }
}
