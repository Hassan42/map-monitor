package com.example.mapmonitor.dto;

import java.time.LocalDateTime;

public class DraftStatusResponse {
    private final boolean exists;
    private final boolean hasChanges;
    private final LocalDateTime createdAt;

    public DraftStatusResponse(boolean exists, boolean hasChanges, LocalDateTime createdAt) {
        this.exists = exists;
        this.hasChanges = hasChanges;
        this.createdAt = createdAt;
    }

    public boolean isExists() {
        return exists;
    }

    public boolean isHasChanges() {
        return hasChanges;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
