package com.example.mapmonitor.model;

import java.time.LocalDateTime;
import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;

@Entity
public class Annotation extends MapElement {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AnnotationKind kind;

    @Column(nullable = false, columnDefinition = "text")
    private String geometry;   // GeoJSON geometry, e.g. {"type":"LineString","coordinates":[[lng,lat],...]}

    private Long factionId;    // optional, the owning Faction's stableId, not its row id

    private String label;      // optional

    private String color;

    @Column(nullable = false)
    @ColumnDefault("1.0")
    private Double scale;      // size multiplier for the drawn icon/arrow, 1.0 = default

    @Column(nullable = false)
    @ColumnDefault("0")
    private Double rotation;   // clockwise degrees from north (the icon's up direction), 0 = unrotated

    // when it's on the map: null start = it has always been there, null end = still there
    private LocalDateTime startTime;

    private LocalDateTime endTime;

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

    @Override
    public EntityType entityType() {
        return EntityType.ANNOTATION;
    }

    @Override
    public String displayName() {
        return label;
    }
}
