package com.example.mapmonitor.model;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
public class Territory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String color;

    // text, not varchar: detailed outlines (e.g. following a real border) run past 4000 characters
    @Column(columnDefinition = "text")
    private String points;   // polygon points, encoded as JSON e.g. "[[lat,lng],[lat,lng],...]"

    private Long stableId;

    @Column(nullable = false)
    private Long factionId;   // the owning Faction's stableId, not its row id

    @ManyToOne
    @JoinColumn(name = "map_version_id", nullable = false)
    private MapVersion mapVersion;

    // deleted shadow: marks this stableId as deleted in this version, hiding rows inherited from older versions
    @Column(nullable = false)
    @ColumnDefault("false")
    private boolean deleted;

    // the shapes over time, in their own table (territory_state), always sorted by date
    @OneToMany(mappedBy = "territory", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("validFrom")
    private List<TerritoryState> history = new ArrayList<>();

    private LocalDateTime endTime;

    public LocalDateTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }

    public List<TerritoryState> getHistory() {
        return history;
    }

    public void setHistory(List<TerritoryState> history) {
        this.history = history;
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

    public String getPoints() {
        return points;
    }

    public void setPoints(String points) {
        this.points = points;
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

    public Long getFactionId() {
        return factionId;
    }

    public void setFactionId(Long factionId) {
        this.factionId = factionId;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
    }
}
