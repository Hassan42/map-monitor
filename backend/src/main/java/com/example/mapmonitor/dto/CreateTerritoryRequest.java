package com.example.mapmonitor.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class CreateTerritoryRequest {
    private String name;
    private String color;
    private String points;
    private Long factionId;
    private Long layerId; // null = in no layer
    private List<TerritoryStateDto> history = new ArrayList<>(); // the shapes over time, see TerritoryStateDto
    private LocalDateTime endTime;
    private Double stackOrder; // drawing order, higher on top; null = 0
    private Boolean cutBeneath; // hides the territories beneath it where it covers them; null = false

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

    public List<TerritoryStateDto> getHistory() {
        return history;
    }

    public void setHistory(List<TerritoryStateDto> history) {
        this.history = history;
    }

    public LocalDateTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }

    public Double getStackOrder() {
        return stackOrder;
    }

    public void setStackOrder(Double stackOrder) {
        this.stackOrder = stackOrder;
    }

    public Boolean getCutBeneath() {
        return cutBeneath;
    }

    public void setCutBeneath(Boolean cutBeneath) {
        this.cutBeneath = cutBeneath;
    }

    public Long getLayerId() {
        return layerId;
    }

    public void setLayerId(Long layerId) {
        this.layerId = layerId;
    }
}
