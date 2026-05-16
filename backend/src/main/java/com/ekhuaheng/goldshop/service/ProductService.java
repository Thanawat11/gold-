package com.ekhuaheng.goldshop.service;

import com.ekhuaheng.goldshop.dto.ProductRequest;
import com.ekhuaheng.goldshop.entity.Product;
import com.ekhuaheng.goldshop.entity.ProductStatus;
import com.ekhuaheng.goldshop.repository.ProductRepository;
import com.ekhuaheng.goldshop.config.SheetNames;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final DocumentNumberService documentNumberService;
    private final GoogleSheetsService sheetsService;
    private final AuditLogService auditLogService;

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public List<Product> getAvailableProducts() {
        return productRepository.findByStatus(ProductStatus.AVAILABLE);
    }

    public Product getByBarcode(String barcode) {
        return productRepository.findByBarcode(barcode)
                .orElseThrow(() -> new IllegalArgumentException("ไม่พบสินค้า"));
    }

    @Transactional
    public Product createProduct(ProductRequest request) {
        Product product = Product.builder()
                .barcode(StringUtils.hasText(request.getBarcode()) ? request.getBarcode() : documentNumberService.productBarcode())
                .name(request.getName())
                .category(request.getCategory())
                .weightGram(request.getWeightGram())
                .weightText(request.getWeightText())
                .costFee(request.getCostFee())
                .status(request.getStatus() == null ? ProductStatus.AVAILABLE : request.getStatus())
                .build();

        Product saved = productRepository.save(product);
        sheetsService.insertData(SheetNames.PRODUCTS, java.util.Map.of(
                "id", saved.getId(),
                "barcode", saved.getBarcode(),
                "name", saved.getName(),
                "category", saved.getCategory(),
                "weightGram", saved.getWeightGram(),
                "weightText", saved.getWeightText() == null ? "" : saved.getWeightText(),
                "status", saved.getStatus().name()
        ));
        auditLogService.record("CREATE_PRODUCT", "Product", saved.getId(), saved.getName());
        return saved;
    }
}
