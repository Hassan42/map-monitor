package com.example.mapmonitor.dto;

import java.time.LocalDateTime;
import com.example.mapmonitor.model.Annotation;
import com.example.mapmonitor.model.AnnotationKind;

public final class AnnotationSummaryResponse implements ElementSummary {
    private final Long id;
    private final AnnotationKind kind;
    private final String geometry;
    private final String line;
    private final Boolean dashed;
    private final Boolean arrow;
    private final Long factionId;
    private final Long layerId;
    private final String label;
    private final String color;
    private final Double scale;
    private final Double rotation;
    private final LocalDateTime startTime;
    private final LocalDateTime endTime;

    private AnnotationSummaryResponse(Annotation annotation) {
        this.id = annotation.getStableId();
        this.kind = annotation.getKind();
        this.geometry = annotation.getGeometry();
        this.line = annotation.getLine();
        this.dashed = annotation.getDashed();
        this.arrow = annotation.getArrow();
        this.factionId = annotation.getFactionId();
        this.layerId = annotation.getLayerId();
        this.label = annotation.getLabel();
        this.color = annotation.getColor();
        this.scale = annotation.getScale();
        this.rotation = annotation.getRotation();
        this.startTime = annotation.getStartTime();
        this.endTime = annotation.getEndTime();
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

    public String getLine() {
        return line;
    }

    public Boolean getDashed() {
        return dashed;
    }

    public Boolean getArrow() {
        return arrow;
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

    public LocalDateTime getStartTime() {
        return startTime;
    }

    public LocalDateTime getEndTime() {
        return endTime;
    }

    public Long getLayerId() {
        return layerId;
    }
}
