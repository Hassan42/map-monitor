package com.example.mapmonitor.dto;

import com.example.mapmonitor.model.Visibility;

public class CreateMapRequest {
    private String title;
    private String description;
    private Visibility visibility; // null = PRIVATE

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
}