package com.example.mapmonitor.dto;

// the API shape of anything a draft can change (see EntityType): one summary response per type, and only these
public sealed interface ElementSummary
        permits TerritorySummaryResponse, EventMarkerSummaryResponse, AnnotationSummaryResponse, LayerSummaryResponse {
}
