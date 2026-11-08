package com.example.mapmonitor.model;

import jakarta.persistence.*;
import org.hibernate.annotations.SQLOrder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
public class Territory extends MapElement {

    private String name;

    private String color;

    // text, not varchar: detailed outlines (e.g. following a real border) run past 4000 characters
    @Column(columnDefinition = "text")
    private String points;   // polygon points, encoded as JSON e.g. "[[lat,lng],[lat,lng],...]"

    @Column(nullable = false)
    private Long factionId;   // the owning Faction's stableId, not its row id

    // the shapes over time, in their own table (territory_state), always sorted by date
    @OneToMany(mappedBy = "territory", cascade = CascadeType.ALL, orphanRemoval = true)
    @SQLOrder("valid_from NULLS FIRST") // the undated shape first: Postgres would sort NULLs last
    private List<TerritoryState> history = new ArrayList<>();

    private LocalDateTime endTime;

    // drawing order among territories: higher is drawn on top. null = 0, then by stableId
    private Double stackOrder;

    // hides what's beneath it: territories under it are shown only where it doesn't cover them. null = false
    private Boolean cutBeneath;

    public Boolean getCutBeneath() {
        return cutBeneath;
    }

    public void setCutBeneath(Boolean cutBeneath) {
        this.cutBeneath = cutBeneath;
    }

    public Double getStackOrder() {
        return stackOrder;
    }

    public void setStackOrder(Double stackOrder) {
        this.stackOrder = stackOrder;
    }

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

    public Long getFactionId() {
        return factionId;
    }

    public void setFactionId(Long factionId) {
        this.factionId = factionId;
    }

    @Override
    public EntityType entityType() {
        return EntityType.TERRITORY;
    }

    @Override
    public String displayName() {
        return name;
    }

    @Override 
    public Territory copy() {
        Territory copy = new Territory();
        copy.setName(this.name);
        copy.setColor(this.color);
        copy.setPoints(this.points);
        copy.setFactionId(this.factionId);
        copy.setEndTime(this.endTime);
        copy.setStackOrder(this.stackOrder);
        copy.setCutBeneath(this.cutBeneath);
        return copy;
    }
}
