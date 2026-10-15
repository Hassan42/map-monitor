package com.example.mapmonitor.dto;

import com.example.mapmonitor.model.EventCategory;
import com.example.mapmonitor.model.EventMarker;

import java.time.LocalDateTime;

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
}
