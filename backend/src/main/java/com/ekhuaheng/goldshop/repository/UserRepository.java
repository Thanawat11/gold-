package com.ekhuaheng.goldshop.repository;

import com.ekhuaheng.goldshop.entity.User;
import com.ekhuaheng.goldshop.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    long countByRole(Role role);
}
