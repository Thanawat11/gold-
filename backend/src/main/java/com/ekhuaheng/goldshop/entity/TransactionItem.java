package com.ekhuaheng.goldshop.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "transaction_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "transaction_id", nullable = false)
    private Transaction transaction;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(nullable = false)
    private String itemType; // SELL, BUY

    @Column(nullable = false)
    private Double price; // ราคาต่อชิ้น ณ ตอนนั้น

    private Double fee; // ค่ากำเหน็จหรือค่าหักเปอร์เซ็นต์
}
