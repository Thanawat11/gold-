package com.ekhuaheng.goldshop.service;

import com.ekhuaheng.goldshop.config.GoldShopProperties;
import com.ekhuaheng.goldshop.dto.GoldPriceResponse;
import com.ekhuaheng.goldshop.dto.GoldPriceUpdateRequest;
import com.ekhuaheng.goldshop.entity.GoldPrice;
import com.ekhuaheng.goldshop.entity.User;
import com.ekhuaheng.goldshop.repository.GoldPriceRepository;
import com.ekhuaheng.goldshop.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.text.DecimalFormat;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class GoldPriceService {

    private static final DecimalFormat PRICE_FORMAT = new DecimalFormat("#,##0.00");

    private final GoldPriceRepository goldPriceRepository;
    private final UserRepository userRepository;
    private final GoldShopProperties properties;
    private final AuditLogService auditLogService;

    public GoldPriceResponse getGoldPrice() {
        GoldPriceResponse livePrice = scrapePrice();
        if (hasPrice(livePrice)) {
            return livePrice;
        }
        return goldPriceRepository.findTopByOrderByEffectiveDateDesc()
                .map(this::fromEntity)
                .orElse(livePrice);
    }

    @org.springframework.scheduling.annotation.Scheduled(fixedDelayString = "${goldshop.gold-price.refresh-interval}")
    public void updatePriceHistory() {
        GoldPriceResponse response = scrapePrice();
        if (hasPrice(response)) {
            GoldPrice entity = GoldPrice.builder()
                    .buyPrice(parsePrice(response.getBar().getBuy()))
                    .sellPrice(parsePrice(response.getBar().getSell()))
                    .build();
            goldPriceRepository.save(entity);
            log.info("Saved current gold price to history: {}", response.getBar().getSell());
        }
    }

    public GoldPrice updateManualPrice(GoldPriceUpdateRequest request) {
        GoldPrice price = GoldPrice.builder()
                .buyPrice(request.getBarBuyPrice())
                .sellPrice(request.getBarSellPrice())
                .updatedBy(currentUser().orElse(null))
                .build();
        GoldPrice saved = goldPriceRepository.save(price);
        auditLogService.record("UPDATE_GOLD_PRICE", "GoldPrice", saved.getId(), "Manual gold price update");
        return saved;
    }

    public java.util.List<GoldPrice> getPriceHistory() {
        return goldPriceRepository.findTop20ByOrderByEffectiveDateDesc();
    }

    private GoldPriceResponse scrapePrice() {
        try {
            Document doc = Jsoup.connect(properties.getGoldPrice().getSourceUrl())
                    .timeout(Math.toIntExact(properties.getGoldPrice().getSourceTimeout().toMillis()))
                    .get();

            String barSell = getElementText(doc, "DetailPlace_uc_goldprices1_lblBLSell");
            String barBuy = getElementText(doc, "DetailPlace_uc_goldprices1_lblBLBuy");
            String ornamentSell = getElementText(doc, "DetailPlace_uc_goldprices1_lblOMSell");
            String ornamentBuy = getElementText(doc, "DetailPlace_uc_goldprices1_lblOMBuy");
            String updateTime = getElementText(doc, "DetailPlace_uc_goldprices1_lblDate");

            return GoldPriceResponse.builder()
                    .bar(GoldPriceResponse.PriceDetail.builder()
                            .buy(barBuy)
                            .sell(barSell)
                            .build())
                    .ornament(GoldPriceResponse.PriceDetail.builder()
                            .buy(ornamentBuy)
                            .sell(ornamentSell)
                            .build())
                    .updateTime(updateTime)
                    .build();

        } catch (IOException e) {
            log.error("Failed to fetch gold price: {}", e.getMessage());
            return GoldPriceResponse.builder()
                    .bar(GoldPriceResponse.PriceDetail.builder().buy(null).sell(null).build())
                    .ornament(GoldPriceResponse.PriceDetail.builder().buy(null).sell(null).build())
                    .updateTime("Error: " + e.getMessage())
                    .build();
        }
    }

    private String getElementText(Document doc, String id) {
        Element element = doc.getElementById(id);
        return element != null ? element.text().trim() : null;
    }

    private Double parsePrice(String price) {
        try {
            return Double.parseDouble(price.replace(",", ""));
        } catch (Exception e) {
            return 0.0;
        }
    }

    private boolean hasPrice(GoldPriceResponse response) {
        return response.getBar() != null
                && response.getBar().getBuy() != null
                && response.getBar().getSell() != null;
    }

    private GoldPriceResponse fromEntity(GoldPrice price) {
        return GoldPriceResponse.builder()
                .bar(GoldPriceResponse.PriceDetail.builder()
                        .buy(PRICE_FORMAT.format(price.getBuyPrice()))
                        .sell(PRICE_FORMAT.format(price.getSellPrice()))
                        .build())
                .ornament(GoldPriceResponse.PriceDetail.builder()
                        .buy(PRICE_FORMAT.format(price.getBuyPrice()))
                        .sell(PRICE_FORMAT.format(price.getSellPrice()))
                        .build())
                .updateTime(price.getEffectiveDate().toString())
                .build();
    }

    private Optional<User> currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return Optional.empty();
        }
        return userRepository.findByUsername(authentication.getName());
    }
}
