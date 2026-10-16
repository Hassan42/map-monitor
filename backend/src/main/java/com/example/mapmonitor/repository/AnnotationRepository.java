package com.example.mapmonitor.repository;

import com.example.mapmonitor.model.Annotation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AnnotationRepository extends JpaRepository<Annotation, Long> {
    List<Annotation> findByMapVersionId(Long mapVersionId);

    boolean existsByMapVersionId(Long mapVersionId);
}
