package com.ekhuaheng.goldshop.dto;

import com.ekhuaheng.goldshop.entity.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserUpdateRequest {
    @NotBlank
    @Size(max = 120)
    private String fullName;

    @Size(min = 6, max = 120)
    private String password;

    @NotNull
    private Role role;
}
