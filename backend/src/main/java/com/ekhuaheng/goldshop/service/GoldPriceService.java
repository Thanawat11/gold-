package com.ekhuaheng.goldshop.service;

import com.ekhuaheng.goldshop.dto.GoldPriceResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
@Slf4j
@RequiredArgsConstructor
public class GoldPriceService {

    private final com.ekhuaheng.goldshop.repository.GoldPriceRepository goldPriceRepository;
    private static final String CLASSIC_URL = "https://classic.goldtraders.or.th/";

    public GoldPriceResponse getGoldPrice() {
        GoldPriceResponse response = scrapePrice();
        return response;
    }

    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 300000) // Every 5 minutes for demo
    public void updatePriceHistory() {
        GoldPriceResponse response = scrapePrice();
        if (!"N/A".equals(response.getBar().getSell())) {
            com.ekhuaheng.goldshop.entity.GoldPrice entity = com.ekhuaheng.goldshop.entity.GoldPrice.builder()
                    .buyPrice(parsePrice(response.getBar().getBuy()))
                    .sellPrice(parsePrice(response.getBar().getSell()))
                    .build();
            goldPriceRepository.save(entity);
            log.info("Saved current gold price to history: {}", response.getBar().getSell());
        }
    }

    public java.util.List<com.ekhuaheng.goldshop.entity.GoldPrice> getPriceHistory() {
        return goldPriceRepository.findTop20ByOrderByEffectiveDateDesc();
    }

    private GoldPriceResponse scrapePrice() {
        try {
            Document doc = Jsoup.connect(CLASSIC_URL)
                    .timeout(10000)
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
                    .bar(GoldPriceResponse.PriceDetail.builder().buy("N/A").sell("N/A").build())
                    .ornament(GoldPriceResponse.PriceDetail.builder().buy("N/A").sell("N/A").build())
                    .updateTime("Error: " + e.getMessage())
                    .build();
        }
    }

    private String getElementText(Document doc, String id) {
        Element element = doc.getElementById(id);
        return element != null ? element.text().trim() : "N/A";
    }

    private Double parsePrice(String price) {
        try {
            return Double.parseDouble(price.replace(",", ""));
        } catch (Exception e) {
            return 0.0;
        }
    }
}
