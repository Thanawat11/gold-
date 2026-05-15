package com.ekhuaheng.goldshop.controller;

import com.ekhuaheng.goldshop.entity.Product;
import com.ekhuaheng.goldshop.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

    @Autowired
    private ProductRepository productRepository;

    @GetMapping
    public ResponseEntity<List<Product>> getAllProducts() {
        return ResponseEntity.ok(productRepository.findAll());
    }

    @GetMapping("/available")
    public ResponseEntity<List<Product>> getAvailableProducts() {
        return ResponseEntity.ok(productRepository.findByStatus("AVAILABLE"));
    }

    @GetMapping("/barcode/{code}")
    public ResponseEntity<Product> getProductByBarcode(@PathVariable String code) {
        return productRepository.findByBarcode(code)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Product> createProduct(@RequestBody Product product) {
        product.setStatus("AVAILABLE");
        return ResponseEntity.ok(productRepository.save(product));
    }
}
