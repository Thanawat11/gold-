package com.ekhuaheng.goldshop.dto;

import java.time.LocalDateTime;

public record ApiError(
        String message,
        String path,
        LocalDateTime timestamp
) {
}
