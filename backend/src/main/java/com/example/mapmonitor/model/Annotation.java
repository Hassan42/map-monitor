package com.example.mapmonitor.model;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;

@Entity
public class Annotation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

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

    private Long stableId;

    @ManyToOne
    @JoinColumn(name = "map_version_id", nullable = false)
    private MapVersion mapVersion;

    // deleted shadow: marks this stableId as deleted in this version, hiding rows inherited from older versions
    @Column(nullable = false)
    @ColumnDefault("false")
    private boolean deleted;

    public Long getId() {
        return id;
    }

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

    public Long getStableId() {
        return stableId;
    }

    public void setStableId(Long stableId) {
        this.stableId = stableId;
    }

    public MapVersion getMapVersion() {
        return mapVersion;
    }

    public void setMapVersion(MapVersion mapVersion) {
        this.mapVersion = mapVersion;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
    }
}
