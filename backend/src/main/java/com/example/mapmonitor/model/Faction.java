package com.example.mapmonitor.model;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;

@Entity
public class Faction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String color;

    private Long stableId;

    @ManyToOne
    @JoinColumn(name = "map_version_id", nullable = false)
    private MapVersion mapVersion;

    // deleted shadow: hides this stableId from this version on, like MapElement's
    @Column(nullable = false)
    @ColumnDefault("false")
    private boolean deleted;

    public boolean isDeleted() {
        return deleted;
    }

    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
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
}
