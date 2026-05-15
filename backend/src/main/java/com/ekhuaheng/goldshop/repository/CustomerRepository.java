package com.ekhuaheng.goldshop.repository;

import com.ekhuaheng.goldshop.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Optional<Customer> findByIdCardNumber(String idCardNumber);
}
