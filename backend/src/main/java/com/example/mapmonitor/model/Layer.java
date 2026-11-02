package com.example.mapmonitor.model;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;

import java.util.ArrayList;
import java.util.List;

@Entity
public class Layer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    private String description;

    private Long stableId;

    @Column(nullable = false)
    @ColumnDefault("false")
    private boolean deleted;

    // where an imported layer came from, set by the server at import and never edited.
    // A snapshot, so it still reads right if that map is renamed or deleted
    private Long creditMapId;
    private String creditMapTitle;
    private String creditUsername;

    public Long getCreditMapId() {
        return creditMapId;
    }

    public void setCreditMapId(Long creditMapId) {
        this.creditMapId = creditMapId;
    }

    public String getCreditMapTitle() {
        return creditMapTitle;
    }

    public void setCreditMapTitle(String creditMapTitle) {
        this.creditMapTitle = creditMapTitle;
    }

    public String getCreditUsername() {
        return creditUsername;
    }

    public void setCreditUsername(String creditUsername) {
        this.creditUsername = creditUsername;
    }

    @ManyToOne
    @JoinColumn(name = "map_version_id", nullable = false)
    private MapVersion mapVersion;

    public MapVersion getMapVersion() {
        return mapVersion;
    }

    public void setMapVersion(MapVersion mapVersion) {
        this.mapVersion = mapVersion;
    }

    public Long getId() {
        return id;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Long getStableId() {
        return stableId;
    }

    public void setStableId(Long stableId) {
        this.stableId = stableId;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
    }
}
