package com.ekhuaheng.goldshop.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CancelTransactionRequest {
    @NotBlank
    @Size(max = 500)
    private String reason;
}
