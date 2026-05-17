package com.ekhuaheng.goldshop.controller;

import com.ekhuaheng.goldshop.dto.CustomerRequest;
import com.ekhuaheng.goldshop.entity.Customer;
import com.ekhuaheng.goldshop.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','STAFF','CASHIER')")
    public ResponseEntity<List<Customer>> list() {
        return ResponseEntity.ok(customerService.getCustomers());
    }

    @GetMapping("/{id}/profile")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','STAFF','CASHIER')")
    public ResponseEntity<?> profile(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.getCustomerProfile(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','STAFF','CASHIER')")
    public ResponseEntity<Customer> create(@Valid @RequestBody CustomerRequest customer) {
        return ResponseEntity.ok(customerService.createCustomer(customer));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','STAFF','CASHIER')")
    public ResponseEntity<Customer> update(@PathVariable Long id, @Valid @RequestBody CustomerRequest customer) {
        return ResponseEntity.ok(customerService.updateCustomer(id, customer));
    }
}
