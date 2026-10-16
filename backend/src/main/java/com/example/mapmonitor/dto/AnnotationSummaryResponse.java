package com.example.mapmonitor.dto;

import com.example.mapmonitor.model.Annotation;
import com.example.mapmonitor.model.AnnotationKind;

public class AnnotationSummaryResponse {
    private final Long id;
    private final AnnotationKind kind;
    private final String geometry;
    private final Long factionId;
    private final String label;
    private final String color;
    private final Double scale;
    private final Double rotation;

    private AnnotationSummaryResponse(Annotation annotation) {
        this.id = annotation.getStableId();
        this.kind = annotation.getKind();
        this.geometry = annotation.getGeometry();
        this.factionId = annotation.getFactionId();
        this.label = annotation.getLabel();
        this.color = annotation.getColor();
        this.scale = annotation.getScale();
        this.rotation = annotation.getRotation();
    }

    public static AnnotationSummaryResponse from(Annotation annotation) {
        return new AnnotationSummaryResponse(annotation);
    }

    public Long getId() {
        return id;
    }

    public AnnotationKind getKind() {
        return kind;
    }

    public String getGeometry() {
        return geometry;
    }

    public Long getFactionId() {
        return factionId;
    }

    public String getLabel() {
        return label;
    }

    public String getColor() {
        return color;
    }

    public Double getScale() {
        return scale;
    }

    public Double getRotation() {
        return rotation;
    }
}
