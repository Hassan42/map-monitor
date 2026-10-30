package com.example.mapmonitor.model;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;

@Entity
public class Map {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    private String description;

    // stored as the name; existing maps get PRIVATE when the column is added
    @Enumerated(EnumType.STRING)
    @ColumnDefault("'PRIVATE'")
    @Column(nullable = false)
    private Visibility visibility = Visibility.PRIVATE;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "published_version_id")
    private MapVersion publishedVersion;


    public Long getId() {
        return id;
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

    public Visibility getVisibility() {
        return visibility;
    }

    public void setVisibility(Visibility visibility) {
        this.visibility = visibility;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public MapVersion getPublishedVersion() { return publishedVersion; }

    public void setPublishedVersion(MapVersion publishedVersion) { this.publishedVersion = publishedVersion; }
}