package com.example.mapmonitor.dto;

import com.example.mapmonitor.model.EventRelation;
import com.example.mapmonitor.model.EventRelationType;

public class EventRelationDto {

    private Long relatedEventId;
    private EventRelationType type;

    public Long getRelatedEventId() {
        return relatedEventId;
    }

    public void setRelatedEventId(Long relatedEventId) {
        this.relatedEventId = relatedEventId;
    }

    public EventRelationType getType() {
        return type;
    }

    public void setType(EventRelationType type) {
        this.type = type;
    }

    public EventRelationDto(Long relatedEventId, EventRelationType type) {
        this.relatedEventId = relatedEventId;
        this.type = type;
    }

    public static EventRelationDto from(EventRelation relation) {
        return new EventRelationDto(relation.getRelatedEventId(), relation.getType());
    }
}
