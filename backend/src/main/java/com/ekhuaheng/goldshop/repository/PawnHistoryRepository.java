package com.ekhuaheng.goldshop.repository;

import com.ekhuaheng.goldshop.entity.PawnHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PawnHistoryRepository extends JpaRepository<PawnHistory, Long> {
    List<PawnHistory> findByPawnTicketIdOrderByCreatedAtDesc(Long pawnTicketId);
}
