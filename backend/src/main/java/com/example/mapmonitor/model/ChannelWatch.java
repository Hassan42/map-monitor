package com.example.mapmonitor.model;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;

// a map watching a public Telegram channel: one row per map and channel
@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"map_id", "channel"}))
public class ChannelWatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "map_id")
    @OnDelete(action = OnDeleteAction.CASCADE) // deleting the map removes its watches
    private Map map;

    @Column(nullable = false, length = 64)
    private String channel; // the channel's username, e.g. "Alibk3" (read from t.me/s/<channel>)

    @Column(nullable = false)
    private boolean active = true;

    private Long lastPostId; // null until the first read: then it starts from the newest post

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    protected ChannelWatch() {
    }

    public ChannelWatch(Map map, String channel) {
        this.map = map;
        this.channel = channel;
    }

    public Long getId() { return id; }
    public Map getMap() { return map; }
    public String getChannel() { return channel; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Long getLastPostId() { return lastPostId; }
    public void setLastPostId(Long lastPostId) { this.lastPostId = lastPostId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
