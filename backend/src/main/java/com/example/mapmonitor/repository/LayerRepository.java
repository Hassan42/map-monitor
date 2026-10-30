package com.example.mapmonitor.repository;

import com.example.mapmonitor.model.Layer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LayerRepository extends JpaRepository<Layer, Long> {
    List<Layer> findByMapVersionId(Long mapVersionId);

    boolean existsByMapVersionId(Long mapVersionId);
}
