package com.example.mapmonitor.model;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;

// a user monitoring a map: one row per user and map
@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "map_id"}))
public class MapMonitor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    @OnDelete(action = OnDeleteAction.CASCADE) // deleting the user removes their monitors
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "map_id")
    @OnDelete(action = OnDeleteAction.CASCADE) // deleting the map removes its monitors
    private Map map;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    protected MapMonitor() {
    }

    public MapMonitor(User user, Map map) {
        this.user = user;
        this.map = map;
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public Map getMap() {
        return map;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
