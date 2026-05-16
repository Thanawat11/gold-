package com.ekhuaheng.goldshop;

import com.ekhuaheng.goldshop.config.GoldShopProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties(GoldShopProperties.class)
public class GoldshopApplication {

	public static void main(String[] args) {
		SpringApplication.run(GoldshopApplication.class, args);
	}

}
