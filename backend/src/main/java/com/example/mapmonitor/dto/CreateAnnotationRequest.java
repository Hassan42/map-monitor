package com.example.mapmonitor.dto;

import com.example.mapmonitor.model.AnnotationKind;

public class CreateAnnotationRequest {
    private AnnotationKind kind;
    private String geometry;
    private Long factionId;
    private String label;
    private String color;
    private Double scale;
    private Double rotation;

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
}
