package com.example.mapmonitor.dto;

import com.example.mapmonitor.model.Layer;

public final class LayerSummaryResponse implements ElementSummary {
    // where an imported layer came from; null for a layer made on this map
    public record Credit(Long mapId, String mapTitle, String username) {}

    private final Long id;
    private final String title;
    private final String description;
    private final Credit credit;

    private LayerSummaryResponse(Layer layer) {
        this.id = layer.getStableId();
        this.title = layer.getTitle();
        this.description = layer.getDescription();
        this.credit = layer.getCreditMapId() == null ? null
                : new Credit(layer.getCreditMapId(), layer.getCreditMapTitle(), layer.getCreditUsername());
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

    public Credit getCredit() {
        return credit;
    }
}
