package com.ekhuaheng.goldshop.service;

import com.ekhuaheng.goldshop.config.GoldShopProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class GoogleSheetsService {

    private final GoldShopProperties properties;
    private final RestTemplate restTemplate;

    public GoogleSheetsService(GoldShopProperties properties) {
        this.properties = properties;
        this.restTemplate = new RestTemplate();
    }

    public List<Map<String, Object>> getData(String sheetName) {
        if (!isEnabled()) {
            return List.of();
        }
        try {
            String url = properties.getGoogleSheets().getWebAppUrl() + "?sheet=" + sheetName;
            log.info("Fetching data from Google Sheets: {}", sheetName);
            return restTemplate.getForObject(url, List.class);
        } catch (Exception e) {
            log.error("Error fetching data from Google Sheets: {}", e.getMessage());
            return List.of();
        }
    }

    public void insertData(String sheetName, Map<String, Object> data) {
        if (!isEnabled()) {
            return;
        }
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("sheet", sheetName);
            body.put("data", data);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            restTemplate.postForLocation(properties.getGoogleSheets().getWebAppUrl(), request);
            log.info("Inserted data into Google Sheets: {}", sheetName);
        } catch (Exception e) {
            log.error("Error inserting data into Google Sheets: {}", e.getMessage());
        }
    }

    public boolean isEnabled() {
        return properties.getGoogleSheets().isEnabled()
                && StringUtils.hasText(properties.getGoogleSheets().getWebAppUrl());
    }
}
