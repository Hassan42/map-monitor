package com.example.mapmonitor.dto;

import com.example.mapmonitor.model.EventCategory;
import java.time.LocalDateTime;

public record PostClassification(
        String kind,              // "event", "duplicate" or "ignore"
        String reason,
        Long duplicateOfId,       // id from recent_events, or null
        ExtractedEvent event      // null unless kind = "event"
) {

    public record ExtractedEvent(
            EventCategory category,
            String title,
            String description,
            String placeName,
            LocalDateTime timestamp,
            Long factionId,
            double confidence
    ) {}
}