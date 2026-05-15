package com.ekhuaheng.goldshop.repository;

import com.ekhuaheng.goldshop.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    Optional<Transaction> findByReceiptNumber(String receiptNumber);
}
