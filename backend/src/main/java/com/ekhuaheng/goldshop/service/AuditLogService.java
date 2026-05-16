package com.ekhuaheng.goldshop.service;

import com.ekhuaheng.goldshop.entity.AuditLog;
import com.ekhuaheng.goldshop.entity.User;
import com.ekhuaheng.goldshop.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public void record(String action, String entityType, Object entityId, String description) {
        AuditLog.AuditLogBuilder builder = AuditLog.builder()
                .action(action)
                .entityType(entityType)
                .entityId(entityId == null ? null : String.valueOf(entityId))
                .description(description)
                .ipAddress(resolveIpAddress());

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            builder.username(user.getUsername()).role(user.getRole().name());
        } else if (authentication != null) {
            builder.username(authentication.getName());
        }

        auditLogRepository.save(builder.build());
    }

    public List<AuditLog> recent() {
        return auditLogRepository.findTop100ByOrderByCreatedAtDesc();
    }

    private String resolveIpAddress() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            HttpServletRequest request = attributes.getRequest();
            String forwardedFor = request.getHeader("X-Forwarded-For");
            if (forwardedFor != null && !forwardedFor.isBlank()) {
                return forwardedFor.split(",")[0].trim();
            }
            return request.getRemoteAddr();
        }
        return null;
    }
}
