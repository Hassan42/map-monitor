package com.example.mapmonitor.dto;

import java.time.LocalDateTime;
import java.util.List;
import com.example.mapmonitor.model.Territory;

public final class TerritorySummaryResponse implements ElementSummary {
    private final Long id;
    private final String name;
    private final String color;
    private final String points;
    private final Long factionId;
    private final Long layerId;
    private final List<TerritoryStateDto> history;
    private final LocalDateTime endTime;

    private TerritorySummaryResponse(Territory territory) {
        this.id = territory.getStableId();
        this.name = territory.getName();
        this.color = territory.getColor();
        this.points = territory.getPoints();
        this.factionId = territory.getFactionId();
        this.layerId = territory.layerId();
        this.history = territory.getHistory().stream().map(TerritoryStateDto::from).toList();
        this.endTime = territory.getEndTime();
    }

    public static TerritorySummaryResponse from(Territory territory) {
        return new TerritorySummaryResponse(territory);
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getColor() {
        return color;
    }

    public String getPoints() {
        return points;
    }

    public Long getFactionId() {
        return factionId;
    }

    public List<TerritoryStateDto> getHistory() {
        return history;
    }

    public LocalDateTime getEndTime() {
        return endTime;
    }

    public Long getLayerId() {
        return layerId;
    }
}
