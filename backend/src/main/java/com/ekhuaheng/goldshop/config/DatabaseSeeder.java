package com.ekhuaheng.goldshop.config;

import com.ekhuaheng.goldshop.entity.Role;
import com.ekhuaheng.goldshop.entity.Customer;
import com.ekhuaheng.goldshop.entity.Product;
import com.ekhuaheng.goldshop.entity.User;
import com.ekhuaheng.goldshop.repository.CustomerRepository;
import com.ekhuaheng.goldshop.repository.ProductRepository;
import com.ekhuaheng.goldshop.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DatabaseSeeder {

    @Bean
    CommandLineRunner initDatabase(UserRepository userRepository, ProductRepository productRepository, CustomerRepository customerRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (userRepository.count() == 0) {
                User admin = User.builder()
                        .username("admin")
                        .password(passwordEncoder.encode("123456"))
                        .fullName("ผู้ดูแลระบบ (Owner)")
                        .role(Role.OWNER)
                        .build();
                userRepository.save(admin);
                System.out.println("✅ สร้างผู้ใช้งานตั้งต้นสำเร็จ (username: admin, password: 123456)");
            }

            if (productRepository.count() == 0) {
                productRepository.save(Product.builder()
                        .barcode("G1001")
                        .name("สร้อยคอ ลายกระดูกงู")
                        .category("สร้อยคอ")
                        .weightGram(15.16)
                        .weightText("1 บาท")
                        .status("AVAILABLE")
                        .build());
                productRepository.save(Product.builder()
                        .barcode("G1002")
                        .name("แหวน ลายเกลี้ยง")
                        .category("แหวน")
                        .weightGram(3.79)
                        .weightText("1 สลึง")
                        .status("AVAILABLE")
                        .build());
                productRepository.save(Product.builder()
                        .barcode("G1003")
                        .name("ทองคำแท่ง")
                        .category("ทองแท่ง")
                        .weightGram(15.244)
                        .weightText("1 บาท")
                        .status("AVAILABLE")
                        .build());
                System.out.println("✅ สร้างสินค้าตัวอย่างสำเร็จ (G1001, G1002, G1003)");
            }

            if (customerRepository.count() == 0) {
                customerRepository.save(Customer.builder()
                        .fullName("คุณสมชาย ใจดี")
                        .phoneNumber("081-234-5678")
                        .address("123 ม.1 กรุงเทพฯ")
                        .build());
                customerRepository.save(Customer.builder()
                        .fullName("คุณสมศรี มีสุข")
                        .phoneNumber("089-999-9999")
                        .address("456 ม.2 นนทบุรี")
                        .build());
                System.out.println("✅ สร้างข้อมูลลูกค้าตัวอย่างสำเร็จ");
            }
        };
    }
}
