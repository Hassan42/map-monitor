package com.example.mapmonitor.dto;

import com.example.mapmonitor.model.EventCategory;
import com.example.mapmonitor.model.EventMarker;
import com.example.mapmonitor.model.EventRelation;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class EventMarkerSummaryResponse {
    private final Long id;
    private final String title;
    private final String description;
    private final Double latitude;
    private final Double longitude;
    private final LocalDateTime timestamp;
    private final EventCategory category;
    private final Long factionId;
    private final String sourceURL;
    private final List<EventRelationDto> relations;
    private final LocalDateTime endTime;
    private final boolean ongoing;
    private final int visibleDays;

    private EventMarkerSummaryResponse(EventMarker event) {
        this.id = event.getStableId();
        this.title = event.getTitle();
        this.description = event.getDescription();
        this.latitude = event.getLatitude();
        this.longitude = event.getLongitude();
        this.timestamp = event.getTimestamp();
        this.category = event.getCategory();
        this.factionId = event.getFactionId();
        this.sourceURL = event.getSourceURL();
        this.relations = event.getRelations().stream().map(EventRelationDto::from).toList();
        this.endTime = event.getEndTime();
        this.ongoing = event.isOngoing();
        this.visibleDays = event.getVisibleDays();
    }

    public List<EventRelationDto> getRelations() {
        return relations;
    }

    public static EventMarkerSummaryResponse from(EventMarker event) {
        return new EventMarkerSummaryResponse(event);
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public EventCategory getCategory() {
        return category;
    }

    public Long getFactionId() {
        return factionId;
    }

    public String getSourceURL() {return sourceURL; }

    public LocalDateTime getEndTime() { return endTime; }

    public boolean isOngoing() { return ongoing; }

    public int getVisibleDays() { return visibleDays; }
}
