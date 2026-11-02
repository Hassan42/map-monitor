package com.example.mapmonitor.dto;

import com.example.mapmonitor.model.Layer;

public final class LayerSummaryResponse implements ElementSummary {
    private final Long id;
    private final String title;
    private final String description;

    private LayerSummaryResponse(Layer layer) {
        this.id = layer.getStableId();
        this.title = layer.getTitle();
        this.description = layer.getDescription();
    }

    public static LayerSummaryResponse from(Layer layer) {
        return new LayerSummaryResponse(layer);
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
