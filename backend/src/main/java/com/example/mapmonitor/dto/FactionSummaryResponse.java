package com.example.mapmonitor.dto;

import com.example.mapmonitor.model.Faction;

public final class FactionSummaryResponse implements ElementSummary {
    private final Long id;
    private final String name;
    private final String color;

    private FactionSummaryResponse(Faction faction) {
        this.id = faction.getStableId();
        this.name = faction.getName();
        this.color = faction.getColor();
    }

    public static FactionSummaryResponse from(Faction faction) {
        return new FactionSummaryResponse(faction);
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
}
