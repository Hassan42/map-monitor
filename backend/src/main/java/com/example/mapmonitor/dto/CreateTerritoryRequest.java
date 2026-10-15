package com.example.mapmonitor.dto;

public class CreateTerritoryRequest {
    private String name;
    private String color;
    private String points;
    private Long factionId;

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
}
