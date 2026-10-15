package com.example.mapmonitor.dto;

import com.example.mapmonitor.model.Map;

public class MapSummaryResponse {
    private final Long id;
    private final String title;
    private final String description;

    private MapSummaryResponse(Map map) {
        this.id = map.getId();
        this.title = map.getTitle();
        this.description = map.getDescription();
    }

    public static MapSummaryResponse from(Map map) {
        return new MapSummaryResponse(map);
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
}