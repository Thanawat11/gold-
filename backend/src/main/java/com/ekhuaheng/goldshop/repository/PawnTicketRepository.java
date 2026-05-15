package com.ekhuaheng.goldshop.repository;

import com.ekhuaheng.goldshop.entity.PawnTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PawnTicketRepository extends JpaRepository<PawnTicket, Long> {
    Optional<PawnTicket> findByTicketNumber(String ticketNumber);
}
