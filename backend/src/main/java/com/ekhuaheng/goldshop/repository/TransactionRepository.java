package com.ekhuaheng.goldshop.repository;

import com.ekhuaheng.goldshop.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    Optional<Transaction> findByReceiptNumber(String receiptNumber);
    List<Transaction> findByTransactionDateBetween(LocalDateTime start, LocalDateTime end);
    List<Transaction> findByCustomerIdOrderByTransactionDateDesc(Long customerId);
}
