package com.ekhuaheng.goldshop.repository;

import com.ekhuaheng.goldshop.entity.TransactionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TransactionItemRepository extends JpaRepository<TransactionItem, Long> {
}
