package com.example.mapmonitor.repository;

import com.example.mapmonitor.model.MapVersion;
import com.example.mapmonitor.model.VersionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MapVersionRepository extends JpaRepository<MapVersion, Long> {
    List<MapVersion> findByMapId(Long mapId);
    List<MapVersion> findByMapIdAndStatusOrderByCreatedAtDesc(Long mapId, VersionStatus status);
}
