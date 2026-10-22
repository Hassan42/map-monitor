package com.example.mapmonitor.model;

import jakarta.persistence.*;
@Entity
@Table(name = "event_relation")
public class EventRelation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // the event this relation belongs to
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id")
    private EventMarker event;

    // the other event's stableId (survives drafts and publishes)
    @Column(nullable = false)
    private Long relatedEventId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(255)")
    private EventRelationType type;

    public Long getId() { return id; }
    public EventMarker getEvent() { return event; }
    public void setEvent(EventMarker event) { this.event = event; }
    public Long getRelatedEventId() { return relatedEventId; }
    public void setRelatedEventId(Long relatedEventId) { this.relatedEventId = relatedEventId; }
    public EventRelationType getType() { return type; }
    public void setType(EventRelationType type) { this.type = type; }
}