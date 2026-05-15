package com.ekhuaheng.goldshop.repository;

import com.ekhuaheng.goldshop.entity.GoldPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GoldPriceRepository extends JpaRepository<GoldPrice, Long> {
    
    @Query("SELECT g FROM GoldPrice g ORDER BY g.effectiveDate DESC LIMIT 1")
    Optional<GoldPrice> findTopByOrderByEffectiveDateDesc();

    java.util.List<GoldPrice> findTop20ByOrderByEffectiveDateDesc();
}
