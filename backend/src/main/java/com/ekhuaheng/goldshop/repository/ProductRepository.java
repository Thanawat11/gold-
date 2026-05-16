package com.ekhuaheng.goldshop.repository;

import com.ekhuaheng.goldshop.entity.Product;
import com.ekhuaheng.goldshop.entity.ProductStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findByBarcode(String barcode);
    List<Product> findByStatus(ProductStatus status);
    long countByStatus(ProductStatus status);
}
