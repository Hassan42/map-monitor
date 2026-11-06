package com.example.mapmonitor.dto;

import java.time.LocalDateTime;
import com.example.mapmonitor.model.AnnotationKind;

public class CreateAnnotationRequest {
    private AnnotationKind kind;
    private String geometry;
    private String line;     // a drawn line's points; null = a ready annotation
    private Boolean dashed;
    private Long factionId;
    private Long layerId; // null = in no layer
    private String label;
    private String color;
    private Double scale;
    private Double rotation;
    private LocalDateTime startTime; // null = always been there
    private LocalDateTime endTime;   // null = still there

    public AnnotationKind getKind() {
        return kind;
    }

    public void setKind(AnnotationKind kind) {
        this.kind = kind;
    }

    public String getGeometry() {
        return geometry;
    }

    public void setGeometry(String geometry) {
        this.geometry = geometry;
    }

    public String getLine() {
        return line;
    }

    public void setLine(String line) {
        this.line = line;
    }

    public Boolean getDashed() {
        return dashed;
    }

    public void setDashed(Boolean dashed) {
        this.dashed = dashed;
    }

    public Long getFactionId() {
        return factionId;
    }

    public void setFactionId(Long factionId) {
        this.factionId = factionId;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public Double getScale() {
        return scale;
    }

    public void setScale(Double scale) {
        this.scale = scale;
    }

    public Double getRotation() {
        return rotation;
    }

    public void setRotation(Double rotation) {
        this.rotation = rotation;
    }

    public LocalDateTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalDateTime startTime) {
        this.startTime = startTime;
    }

    public LocalDateTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }

    public Long getLayerId() {
        return layerId;
    }

    public void setLayerId(Long layerId) {
        this.layerId = layerId;
    }
}
