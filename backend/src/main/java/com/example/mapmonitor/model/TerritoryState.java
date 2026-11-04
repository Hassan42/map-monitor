package com.example.mapmonitor.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

// one shape of a territory over time: it holds from validFrom until the next state's validFrom.
// Belongs to one Territory row; a draft's shadow row gets its own copies of the states
@Entity
@Table(name = "territory_state")
public class TerritoryState {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "territory_id")
    private Territory territory;

    // null: this shape has always been there. "from" is a reserved word in SQL
    @Column(name = "valid_from")
    private LocalDateTime validFrom;

    @Column(columnDefinition = "text", nullable = false)
    private String points;

    private Long factionId;   // the owning Faction's stableId, like Territory.factionId

    private String color;

    public Long getId() {
        return id;
    }

    public Territory getTerritory() {
        return territory;
    }

    public void setTerritory(Territory territory) {
        this.territory = territory;
    }

    public LocalDateTime getValidFrom() {
        return validFrom;
    }

    public void setValidFrom(LocalDateTime validFrom) {
        this.validFrom = validFrom;
    }

    public String getPoints() {
        return points;
    }

    public void setPoints(String points) {
        this.points = points;
    }

    public Long getFactionId() {
        return factionId;
    }

    public void setFactionId(Long factionId) {
        this.factionId = factionId;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }
}
