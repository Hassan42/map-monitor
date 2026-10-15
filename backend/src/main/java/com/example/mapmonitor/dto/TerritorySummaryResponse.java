package com.example.mapmonitor.dto;

import com.example.mapmonitor.model.Territory;

public class TerritorySummaryResponse {
    private final Long id;
    private final String name;
    private final String color;
    private final String points;
    private final Long factionId;

    private TerritorySummaryResponse(Territory territory) {
        this.id = territory.getStableId();
        this.name = territory.getName();
        this.color = territory.getColor();
        this.points = territory.getPoints();
        this.factionId = territory.getFactionId();
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
}
