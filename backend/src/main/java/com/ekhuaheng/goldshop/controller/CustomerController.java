package com.ekhuaheng.goldshop.controller;

import com.ekhuaheng.goldshop.entity.Customer;
import com.ekhuaheng.goldshop.repository.CustomerRepository;
import com.ekhuaheng.goldshop.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerRepository customerRepository;
    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','CASHIER')")
    public ResponseEntity<List<Customer>> list() {
        return ResponseEntity.ok(customerRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','CASHIER')")
    public ResponseEntity<Customer> create(@RequestBody Customer customer) {
        Customer saved = customerRepository.save(customer);
        auditLogService.record("CREATE_CUSTOMER", "Customer", saved.getId(), saved.getFullName());
        return ResponseEntity.ok(saved);
    }
}
