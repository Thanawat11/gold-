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

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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
                .or(() -> productRepository.findByQrCode(barcode))
                .orElseThrow(() -> new IllegalArgumentException("ไม่พบสินค้า"));
    }

    @Transactional
    public Product createProduct(ProductRequest request) {
        String barcode = StringUtils.hasText(request.getBarcode()) ? request.getBarcode() : documentNumberService.productBarcode();
        String qrCode = StringUtils.hasText(request.getQrCode()) ? request.getQrCode() : barcode;
        Double makingFee = request.getMakingFee() != null ? request.getMakingFee() : request.getCostFee();

        Product product = Product.builder()
                .barcode(barcode)
                .qrCode(qrCode)
                .name(request.getName())
                .category(request.getCategory())
                .design(request.getDesign())
                .goldPercent(request.getGoldPercent())
                .weightGram(request.getWeightGram())
                .weightText(request.getWeightText())
                .makingFee(makingFee)
                .costFee(makingFee)
                .costAmount(request.getCostAmount())
                .imageUrl(request.getImageUrl())
                .status(request.getStatus() == null ? ProductStatus.AVAILABLE : request.getStatus())
                .build();

        Product saved = productRepository.save(product);
        sheetsService.insertData(SheetNames.PRODUCTS, productSheetRow(saved));
        auditLogService.record("CREATE_PRODUCT", "Product", saved.getId(), saved.getName());
        return saved;
    }

    @Transactional
    public Product updateProduct(Long id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("ไม่พบสินค้า"));

        if (StringUtils.hasText(request.getBarcode()) && !request.getBarcode().equals(product.getBarcode())) {
            productRepository.findByBarcode(request.getBarcode())
                    .filter(existing -> !existing.getId().equals(product.getId()))
                    .ifPresent(existing -> {
                        throw new IllegalArgumentException("บาร์โค้ดนี้ถูกใช้แล้ว");
                    });
            product.setBarcode(request.getBarcode());
        }

        product.setQrCode(StringUtils.hasText(request.getQrCode()) ? request.getQrCode() : product.getBarcode());
        product.setName(request.getName());
        product.setCategory(request.getCategory());
        product.setDesign(request.getDesign());
        product.setGoldPercent(request.getGoldPercent());
        product.setWeightGram(request.getWeightGram());
        product.setWeightText(request.getWeightText());
        Double makingFee = request.getMakingFee() != null ? request.getMakingFee() : request.getCostFee();
        product.setMakingFee(makingFee);
        product.setCostFee(makingFee);
        product.setCostAmount(request.getCostAmount());
        product.setImageUrl(request.getImageUrl());
        product.setStatus(request.getStatus() == null ? product.getStatus() : request.getStatus());

        Product saved = productRepository.save(product);
        auditLogService.record("UPDATE_PRODUCT", "Product", saved.getId(), saved.getName());
        return saved;
    }

    private Map<String, Object> productSheetRow(Product product) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", product.getId());
        row.put("barcode", product.getBarcode());
        row.put("qrCode", product.getQrCode() == null ? "" : product.getQrCode());
        row.put("name", product.getName());
        row.put("category", product.getCategory());
        row.put("design", product.getDesign() == null ? "" : product.getDesign());
        row.put("goldPercent", product.getGoldPercent() == null ? "" : product.getGoldPercent());
        row.put("weightGram", product.getWeightGram());
        row.put("weightText", product.getWeightText() == null ? "" : product.getWeightText());
        row.put("makingFee", product.getMakingFee() == null ? "" : product.getMakingFee());
        row.put("costFee", product.getCostFee() == null ? "" : product.getCostFee());
        row.put("costAmount", product.getCostAmount() == null ? "" : product.getCostAmount());
        row.put("imageUrl", product.getImageUrl() == null ? "" : product.getImageUrl());
        row.put("status", product.getStatus().name());
        return row;
    }
}
