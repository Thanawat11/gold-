package com.ekhuaheng.goldshop.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "products")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String barcode;

    @Column(unique = true)
    private String qrCode;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category; // e.g., สร้อยคอ, แหวน

    private String design;

    private Double goldPercent;

    @Column(nullable = false)
    private Double weightGram; // เก็บน้ำหนักเป็นกรัม

    private String weightText; // e.g., 1 บาท, 2 สลึง

    private Double makingFee;

    private Double costFee; // ค่ากำเหน็จต้นทุน

    private Double costAmount;

    @Column(columnDefinition = "TEXT")
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductStatus status;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
