package com.example.mapmonitor.dto;

import com.example.mapmonitor.model.TerritoryState;

import java.time.LocalDateTime;

// one shape of a territory over time, as the API sends it: it holds from `from` until the next one's `from`
public record TerritoryStateDto(LocalDateTime from, String points, Long factionId, String color) {

    public static TerritoryStateDto from(TerritoryState state) {
        return new TerritoryStateDto(state.getValidFrom(), state.getPoints(), state.getFactionId(), state.getColor());
    }
}
