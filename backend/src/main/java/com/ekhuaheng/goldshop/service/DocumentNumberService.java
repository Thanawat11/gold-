package com.ekhuaheng.goldshop.service;

import com.ekhuaheng.goldshop.config.GoldShopProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class DocumentNumberService {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.BASIC_ISO_DATE;
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final GoldShopProperties properties;
    private final SecureRandom secureRandom = new SecureRandom();

    public String receiptNumber() {
        return build(properties.getDocumentNumbers().getReceiptPrefix());
    }

    public String pawnTicketNumber() {
        return build(properties.getDocumentNumbers().getPawnTicketPrefix());
    }

    public String productBarcode() {
        return build(properties.getDocumentNumbers().getProductBarcodePrefix());
    }

    private String build(String prefix) {
        return String.format("%s-%s-%s", prefix, LocalDate.now().format(DATE_FORMAT), randomSuffix());
    }

    private String randomSuffix() {
        StringBuilder value = new StringBuilder();
        for (int i = 0; i < 6; i++) {
            value.append(ALPHABET.charAt(secureRandom.nextInt(ALPHABET.length())));
        }
        return value.toString();
    }
}
