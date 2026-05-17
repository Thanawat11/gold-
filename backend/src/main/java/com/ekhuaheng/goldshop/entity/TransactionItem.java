package com.ekhuaheng.goldshop.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
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
    @JsonIgnore
    private Transaction transaction;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionItemType itemType;

    @Column(nullable = false)
    private Double price; // ราคาต่อชิ้น ณ ตอนนั้น

    private Double fee; // ค่ากำเหน็จหรือค่าหักเปอร์เซ็นต์
}
