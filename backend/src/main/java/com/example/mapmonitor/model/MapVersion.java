package com.example.mapmonitor.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class MapVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "map_id", nullable = false)
    private Map map;

    @Enumerated(EnumType.STRING)
    private VersionStatus status;

    @ManyToOne
    @JoinColumn(name = "based_on_version_id")
    private MapVersion basedOnVersion;

    private LocalDateTime createdAt;

    public Long getId() { return id; }

    @JsonIgnore
    public Map getMap() { return map; }

    public void setMap(Map map) { this.map = map; }

    public VersionStatus getStatus() { return status; }

    public void setStatus(VersionStatus status) { this.status = status; }

    public MapVersion getBasedOnVersion() { return basedOnVersion; }

    public void setBasedOnVersion(MapVersion basedOnVersion) { this.basedOnVersion = basedOnVersion; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}