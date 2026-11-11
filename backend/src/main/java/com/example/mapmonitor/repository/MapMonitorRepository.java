package com.example.mapmonitor.repository;

import com.example.mapmonitor.model.MapMonitor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface MapMonitorRepository extends JpaRepository<MapMonitor, Long> {
    long countByMapId(Long mapId);

    boolean existsByUserIdAndMapId(Long userId, Long mapId);

    boolean existsByUserFirebaseUidAndMapId(String firebaseUid, Long mapId);

    // ids only: no need to load the maps themselves
    @Query("select m.map.id from MapMonitor m where m.user.id = :userId")
    List<Long> findMapIdsByUserId(Long userId);
}
