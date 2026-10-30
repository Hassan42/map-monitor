package com.example.mapmonitor.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;

// the versioning every element drawn on a map shares: one row per MapVersion, tied together by stableId.
// @MappedSuperclass: no table of its own, each subclass keeps its own table with these columns in it
@MappedSuperclass
public abstract class MapElement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long stableId;

    @ManyToOne
    @JoinColumn(name = "map_version_id", nullable = false)
    private MapVersion mapVersion;

    // deleted shadow: marks this stableId as deleted in this version, hiding rows inherited from older versions
    @Column(nullable = false)
    @ColumnDefault("false")
    private boolean deleted;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "layer_id")      // nullable: an element doesn't have to be in a layer
    private Layer layer;

    // which kind of element this is, e.g. for listing changes
    public abstract EntityType entityType();

    // a short name to show the element by (title, name or label)
    public abstract String displayName();

    public Long getId() {
        return id;
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

    @JsonIgnore // raw entity responses send layerId instead of the whole (lazy) layer
    public Layer getLayer() {
        return layer;
    }

    public void setLayer(Layer layer) {
        this.layer = layer;
    }

    // the layer's id for responses; null when the element is in no layer. getId() on the lazy
    // proxy doesn't load the layer
    @JsonProperty("layerId")
    public Long layerId() {
        return layer != null ? layer.getId() : null;
    }
}
