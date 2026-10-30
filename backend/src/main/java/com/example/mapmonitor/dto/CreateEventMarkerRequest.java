package com.example.mapmonitor.dto;

import com.example.mapmonitor.model.EventCategory;
import com.example.mapmonitor.model.EventRelation;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class CreateEventMarkerRequest {
    private String title;
    private String description;
    private Double latitude;
    private Double longitude;
    private LocalDateTime timestamp;
    private EventCategory category;
    private Long factionId;
    private Long layerId; // null = in no layer
    private String sourceURL;
    private List<EventRelationDto> relations;
    private LocalDateTime endTime;   // null: a moment (ends when it starts) or ongoing
    private boolean ongoing;
    private Integer visibleDays;     // null: the default

    public LocalDateTime getEndTime() { return endTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }
    public boolean isOngoing() { return ongoing; }
    public void setOngoing(boolean ongoing) { this.ongoing = ongoing; }
    public Integer getVisibleDays() { return visibleDays; }
    public void setVisibleDays(Integer visibleDays) { this.visibleDays = visibleDays; }

    public List<EventRelationDto> getRelations() {
        return relations;
    }

    public void setRelations(List<EventRelationDto> relations) {
        this.relations = relations;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public EventCategory getCategory() {
        return category;
    }

    public void setCategory(EventCategory category) {
        this.category = category;
    }

    public Long getFactionId() {
        return factionId;
    }

    public void setFactionId(Long factionId) {
        this.factionId = factionId;
    }

    public String getSourceURL() {
        return sourceURL;
    }

    public void setSourceURL(String sourceURL){
        this.sourceURL = sourceURL;
    }

    public Long getLayerId() {
        return layerId;
    }

    public void setLayerId(Long layerId) {
        this.layerId = layerId;
    }
}
