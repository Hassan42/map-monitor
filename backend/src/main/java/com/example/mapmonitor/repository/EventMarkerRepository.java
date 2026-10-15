package com.example.mapmonitor.repository;

import com.example.mapmonitor.model.EventMarker;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventMarkerRepository extends JpaRepository<EventMarker, Long> {
    List<EventMarker> findByMapVersionId(Long mapVersionId);

    boolean existsByMapVersionId(Long mapVersionId);
}
