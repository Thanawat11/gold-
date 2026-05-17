package com.ekhuaheng.goldshop.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "customers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fullName;

    private String phoneNumber;

    @Enumerated(EnumType.STRING)
    private IdentityType identityType;

    @Column(unique = true)
    private String idCardNumber; // เลขบัตรประชาชนหรือ Passport

    private String address;

    @Enumerated(EnumType.STRING)
    private CustomerTrustLevel trustLevel;

    @Column(columnDefinition = "TEXT")
    private String idCardImageUrl;

    @Column(columnDefinition = "TEXT")
    private String customerImageUrl;

    @Column(columnDefinition = "TEXT")
    private String documentUrl;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        normalizeIdentityType();
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        normalizeIdentityType();
    }

    private void normalizeIdentityType() {
        if (identityType == null) {
            identityType = IdentityType.THAI_ID;
        }
        if (trustLevel == null) {
            trustLevel = CustomerTrustLevel.NORMAL;
        }
    }
}
