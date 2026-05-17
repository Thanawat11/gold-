package com.ekhuaheng.goldshop.repository;

import com.ekhuaheng.goldshop.entity.TransactionPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TransactionPaymentRepository extends JpaRepository<TransactionPayment, Long> {
}
