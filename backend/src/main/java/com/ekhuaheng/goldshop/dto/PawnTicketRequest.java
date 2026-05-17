package com.ekhuaheng.goldshop.dto;

import com.ekhuaheng.goldshop.entity.IdentityType;
import lombok.Data;
import java.time.LocalDate;
import jakarta.validation.constraints.NotNull;

@Data
public class PawnTicketRequest {
    private Long customerId;
    private String customerName;
    private String customerPhone;
    private IdentityType identityType;
    private String identityNumber;
    private String idCard;
    private Long productId;
    private String productName;
    private String category;
    private Double weightGram;
    private String weightText;
    @NotNull
    private Double principalAmount;
    private Double interestRate;
    private LocalDate pawnDate;
    private LocalDate dueDate;
}
