package com.ekhuaheng.goldshop.controller;

import com.ekhuaheng.goldshop.dto.UserCreateRequest;
import com.ekhuaheng.goldshop.dto.UserResponse;
import com.ekhuaheng.goldshop.dto.UserUpdateRequest;
import com.ekhuaheng.goldshop.entity.Role;
import com.ekhuaheng.goldshop.entity.User;
import com.ekhuaheng.goldshop.repository.UserRepository;
import com.ekhuaheng.goldshop.service.AuditLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<List<UserResponse>> list() {
        List<UserResponse> users = userRepository.findAll(Sort.by(Sort.Direction.ASC, "id")).stream()
                .map(UserResponse::from)
                .toList();
        return ResponseEntity.ok(users);
    }

    @PostMapping
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<UserResponse> create(@Valid @RequestBody UserCreateRequest request) {
        String username = request.getUsername().trim();
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("ชื่อผู้ใช้งานนี้มีอยู่แล้ว");
        }

        User user = User.builder()
                .username(username)
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .role(request.getRole())
                .build();
        User saved = userRepository.save(user);
        auditLogService.record("CREATE_USER", "User", saved.getId(), saved.getUsername());
        return ResponseEntity.ok(UserResponse.from(saved));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<UserResponse> update(@PathVariable Long id, @Valid @RequestBody UserUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้งาน"));
        preventRemovingLastOwner(user, request.getRole());

        user.setFullName(request.getFullName().trim());
        user.setRole(request.getRole());
        if (StringUtils.hasText(request.getPassword())) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        User saved = userRepository.save(user);
        auditLogService.record("UPDATE_USER", "User", saved.getId(), saved.getUsername());
        return ResponseEntity.ok(UserResponse.from(saved));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้งาน"));
        User currentUser = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (currentUser.getId().equals(id)) {
            throw new RuntimeException("ไม่สามารถลบผู้ใช้งานที่กำลังเข้าสู่ระบบอยู่");
        }
        preventRemovingLastOwner(user, null);

        userRepository.delete(user);
        auditLogService.record("DELETE_USER", "User", id, user.getUsername());
        return ResponseEntity.noContent().build();
    }

    private void preventRemovingLastOwner(User user, Role newRole) {
        boolean removingOwner = user.getRole() == Role.OWNER && newRole != Role.OWNER;
        if (removingOwner && userRepository.countByRole(Role.OWNER) <= 1) {
            throw new RuntimeException("ต้องมีผู้ใช้งานสิทธิ์เจ้าของร้านอย่างน้อย 1 คน");
        }
    }
}
