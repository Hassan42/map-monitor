package com.example.mapmonitor.repository;

import com.example.mapmonitor.model.Map;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MapRepository extends JpaRepository<Map, Long> {
    List<Map> findByUserId(Long userId);

    long countByUserId(Long userId);
}