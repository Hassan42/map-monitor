package com.example.mapmonitor.repository;

import com.example.mapmonitor.model.Territory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TerritoryRepository extends JpaRepository<Territory, Long> {
    List<Territory> findByMapVersionId(Long mapVersionId);

    boolean existsByMapVersionId(Long mapVersionId);
}
