package com.ekhuaheng.goldshop.dto;

import com.ekhuaheng.goldshop.entity.ProductStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ProductRequest {
    private String barcode;
    private String qrCode;
    @NotBlank
    private String name;
    @NotBlank
    private String category;
    private String design;
    private Double goldPercent;
    @NotNull
    private Double weightGram;
    private String weightText;
    private Double makingFee;
    private Double costFee;
    private Double costAmount;
    private String imageUrl;
    private ProductStatus status;
}
