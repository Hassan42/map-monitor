package com.example.mapmonitor.dto;

import com.example.mapmonitor.model.ChangeAction;
import com.example.mapmonitor.model.EntityType;

// one element the draft changed: its published version (before) and its draft version (after), as the
// usual summary response for its type. before is null when added, after is null when deleted
public record ChangeDto(EntityType entityType, Long stableId, ChangeAction action, String name,
                        ElementSummary before, ElementSummary after) {
}
