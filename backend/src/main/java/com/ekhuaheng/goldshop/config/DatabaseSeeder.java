package com.ekhuaheng.goldshop.config;

import com.ekhuaheng.goldshop.entity.Role;
import com.ekhuaheng.goldshop.entity.User;
import com.ekhuaheng.goldshop.repository.UserRepository;
import com.ekhuaheng.goldshop.service.GoogleSheetsService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;

@Configuration
@Slf4j
public class DatabaseSeeder {

    @Bean
    CommandLineRunner initDatabase(UserRepository userRepository, 
                                 PasswordEncoder passwordEncoder,
                                 GoogleSheetsService sheetsService,
                                 GoldShopProperties properties) {
        return args -> {
            GoldShopProperties.Seed.Admin adminConfig = properties.getSeed().getAdmin();
            if (!adminConfig.isEnabled() || !StringUtils.hasText(adminConfig.getPassword())) {
                log.info("Admin seeding skipped. Configure GOLDSHOP_ADMIN_PASSWORD to create the first owner account.");
                return;
            }

            if (userRepository.findByUsername(adminConfig.getUsername()).isEmpty()) {
                String encodedPassword = passwordEncoder.encode(adminConfig.getPassword());
                
                User admin = User.builder()
                        .username(adminConfig.getUsername())
                        .password(encodedPassword)
                        .fullName(adminConfig.getFullName())
                        .role(adminConfig.getRole() == null ? Role.OWNER : adminConfig.getRole())
                        .build();
                userRepository.save(admin);
                
                try {
                    List<Map<String, Object>> existingUsers = sheetsService.getData(SheetNames.USERS);
                    boolean adminExists = existingUsers.stream()
                            .anyMatch(u -> adminConfig.getUsername().equals(String.valueOf(u.get("username"))));
                    
                    if (!adminExists) {
                        sheetsService.insertData(SheetNames.USERS, Map.of(
                            "username", adminConfig.getUsername(),
                            "password", encodedPassword,
                            "fullName", adminConfig.getFullName(),
                            "role", admin.getRole().name()
                        ));
                    }
                } catch (Exception e) {
                    log.error("Unable to sync seeded admin to Google Sheets: {}", e.getMessage());
                }
            }
        };
    }
}
