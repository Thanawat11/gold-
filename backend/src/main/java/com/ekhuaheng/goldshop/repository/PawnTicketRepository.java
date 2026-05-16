package com.ekhuaheng.goldshop.repository;

import com.ekhuaheng.goldshop.entity.PawnTicket;
import com.ekhuaheng.goldshop.entity.PawnStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PawnTicketRepository extends JpaRepository<PawnTicket, Long> {
    Optional<PawnTicket> findByTicketNumber(String ticketNumber);
    List<PawnTicket> findByStatus(PawnStatus status);
    List<PawnTicket> findByStatusAndDueDateLessThanEqual(PawnStatus status, LocalDate dueDate);
}
