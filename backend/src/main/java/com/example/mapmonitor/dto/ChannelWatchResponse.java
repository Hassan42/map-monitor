package com.example.mapmonitor.dto;

import com.example.mapmonitor.model.ChannelWatch;

public record ChannelWatchResponse(Long id, String channel, boolean active) {

    public static ChannelWatchResponse from(ChannelWatch watch) {
        return new ChannelWatchResponse(watch.getId(), watch.getChannel(), watch.isActive());
    }
}
