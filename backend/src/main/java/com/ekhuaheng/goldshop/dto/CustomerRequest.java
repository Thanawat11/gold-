package com.ekhuaheng.goldshop.dto;

import com.ekhuaheng.goldshop.entity.CustomerTrustLevel;
import com.ekhuaheng.goldshop.entity.IdentityType;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CustomerRequest {
    @NotBlank
    private String fullName;
    private String phoneNumber;
    private IdentityType identityType;
    private String idCardNumber;
    private String address;
    private CustomerTrustLevel trustLevel;
    private String idCardImageUrl;
    private String customerImageUrl;
    private String documentUrl;
    private String notes;
}
