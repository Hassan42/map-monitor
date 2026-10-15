package com.example.mapmonitor.repository;

import com.example.mapmonitor.model.Faction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FactionRepository extends JpaRepository<Faction, Long> {
    List<Faction> findByMapVersionId(Long mapVersionId);

    boolean existsByMapVersionId(Long mapVersionId);
}
