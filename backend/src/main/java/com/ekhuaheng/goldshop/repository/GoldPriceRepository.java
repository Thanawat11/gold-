package com.ekhuaheng.goldshop.repository;

import com.ekhuaheng.goldshop.entity.GoldPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GoldPriceRepository extends JpaRepository<GoldPrice, Long> {
    Optional<GoldPrice> findTopByOrderByEffectiveDateDesc();

    java.util.List<GoldPrice> findTop20ByOrderByEffectiveDateDesc();
}
