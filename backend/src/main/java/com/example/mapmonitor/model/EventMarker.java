package com.example.mapmonitor.model;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
public class EventMarker extends MapElement {

    private String title;

    private String description;

    private Double latitude;

    private Double longitude;

    private LocalDateTime timestamp;

    // stored by name through a converter, so the database gets no constraint listing today's categories
    @Convert(converter = EventCategoryConverter.class)
    @Column(nullable = false, columnDefinition = "varchar(255)")
    @ColumnDefault("'OTHER'")
    private EventCategory category;

    @Column(nullable = false)
    private Long factionId;   // the owning Faction's stableId, not its row id

    @Column(length = 2048)
    private String sourceURL;

    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<EventRelation> relations = new HashSet<>();

    private LocalDateTime endTime;

    @Column(nullable = false)
    @ColumnDefault("false")
    private boolean ongoing;

    // how many days the event stays on the map after it ends (fading out)
    @Column(nullable = false)
    @ColumnDefault("7")
    private int visibleDays = 7;

    public int getVisibleDays() {
        return visibleDays;
    }

    public void setVisibleDays(int visibleDays) {
        this.visibleDays = visibleDays;
    }

    public LocalDateTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }

    public boolean isOngoing() {
        return ongoing;
    }

    public void setOngoing(boolean ongoing) {
        this.ongoing = ongoing;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public EventCategory getCategory() {
        return category;
    }

    public void setCategory(EventCategory category) {
        this.category = category;
    }

    public Long getFactionId() {
        return factionId;
    }

    public void setFactionId(Long factionId) {
        this.factionId = factionId;
    }

    public String getSourceURL() { return sourceURL; }

    public void setSourceURL(String source) { this.sourceURL = source; }

    public Set<EventRelation> getRelations() {
        return relations;
    }

    public void setRelations(Set<EventRelation> relations) {
        this.relations = relations;
    }

    @Override
    public EntityType entityType() {
        return EntityType.EVENT;
    }

    @Override
    public String displayName() {
        return title;
    }

    @Override 
    public EventMarker copy() {
        EventMarker copy = new EventMarker();
        copy.setTitle(this.title);
        copy.setDescription(this.description);
        copy.setLatitude(this.latitude);
        copy.setLongitude(this.longitude);
        copy.setTimestamp(this.timestamp);
        copy.setCategory(this.category);
        copy.setFactionId(this.factionId);
        copy.setSourceURL(this.sourceURL);
        copy.setEndTime(this.endTime);
        copy.setOngoing(this.ongoing);
        copy.setVisibleDays(this.visibleDays);
        return copy;
    }
}
