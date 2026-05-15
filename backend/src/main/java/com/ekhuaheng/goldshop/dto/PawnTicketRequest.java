package com.ekhuaheng.goldshop.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class PawnTicketRequest {
    private Long customerId;
    private Long productId;
    private Double principalAmount;
    private Double interestRate; // e.g., 1.25
    private LocalDate pawnDate;
    private LocalDate dueDate;
}
