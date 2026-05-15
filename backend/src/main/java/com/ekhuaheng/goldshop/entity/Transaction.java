package com.ekhuaheng.goldshop.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String receiptNumber;

    @ManyToOne
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User createdBy; // พนักงานที่ทำรายการ

    @Column(nullable = false)
    private String transactionType; // SELL, BUY, TRADE_IN

    private Double totalAmount;
    private Double discount;
    private Double netAmount;

    @Column(nullable = false)
    private String paymentMethod; // CASH, TRANSFER, CREDIT_CARD

    @OneToMany(mappedBy = "transaction", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<TransactionItem> items;

    @Column(updatable = false)
    private LocalDateTime transactionDate;

    @PrePersist
    protected void onCreate() {
        transactionDate = LocalDateTime.now();
        if (this.receiptNumber == null) {
            this.receiptNumber = "INV" + System.currentTimeMillis();
        }
    }
}
