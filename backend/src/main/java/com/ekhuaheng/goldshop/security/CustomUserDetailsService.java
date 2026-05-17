package com.ekhuaheng.goldshop.security;

import com.ekhuaheng.goldshop.entity.User;
import com.ekhuaheng.goldshop.entity.Role;
import com.ekhuaheng.goldshop.repository.UserRepository;
import com.ekhuaheng.goldshop.service.GoogleSheetsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final GoogleSheetsService sheetsService;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username).orElse(null);
        
        if (user == null) {
            try {
                List<Map<String, Object>> sheetUsers = sheetsService.getData("Users");
                if (sheetUsers != null) {
                    Map<String, Object> sheetUser = sheetUsers.stream()
                            .filter(u -> username.equals(String.valueOf(u.get("username"))))
                            .findFirst()
                            .orElse(null);
                    
                    if (sheetUser != null) {
                        user = new User();
                        user.setUsername(String.valueOf(sheetUser.get("username")));
                        user.setPassword(String.valueOf(sheetUser.get("password"))); // ต้องเป็น BCrypt Hashed เท่านั้น
                        user.setFullName(String.valueOf(sheetUser.get("fullName")));
                        
                        Object roleValue = sheetUser.get("role");
                        String roleStr = roleValue == null ? Role.STAFF.name() : String.valueOf(roleValue);
                        try {
                            user.setRole(Role.valueOf(roleStr));
                        } catch (IllegalArgumentException ignored) {
                            user.setRole(Role.STAFF);
                        }
                    }
                }
            } catch (Exception e) {
                log.error("Error loading user from Google Sheets: {}", e.getMessage());
            }
        }

        if (user == null) {
            log.warn("Username not found: {}", username);
            throw new UsernameNotFoundException("User Not Found with username: " + username);
        }

        return user;
    }
}
