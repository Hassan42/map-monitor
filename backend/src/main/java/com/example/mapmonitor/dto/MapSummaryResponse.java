package com.example.mapmonitor.dto;

import com.example.mapmonitor.model.Map;
import com.example.mapmonitor.model.Visibility;

import java.util.List;

public class MapSummaryResponse {
    private final Long id;
    private final String title;
    private final String description;
    private final Visibility visibility;
    private final List<String> countries; // ISO 3166 two-letter codes
    private final boolean owned; // whether the caller owns it: only the owner may edit (visitors just view)

    private MapSummaryResponse(Map map, String viewerUid) {
        this.id = map.getId();
        this.title = map.getTitle();
        this.description = map.getDescription();
        this.visibility = map.getVisibility();
        this.countries = List.copyOf(map.getCountries());
        this.owned = map.getUser().getFirebaseUid().equals(viewerUid); // viewerUid is null for a visitor
    }

    public static MapSummaryResponse from(Map map, String viewerUid) {
        return new MapSummaryResponse(map, viewerUid);
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

    public Visibility getVisibility() {
        return visibility;
    }

    public List<String> getCountries() {
        return countries;
    }

    public boolean isOwned() {
        return owned;
    }
}