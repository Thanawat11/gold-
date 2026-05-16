package com.ekhuaheng.goldshop.dto;

import com.ekhuaheng.goldshop.entity.ProductStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ProductRequest {
    private String barcode;
    @NotBlank
    private String name;
    @NotBlank
    private String category;
    @NotNull
    private Double weightGram;
    private String weightText;
    private Double costFee;
    private ProductStatus status;
}
