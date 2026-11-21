package com.example.mapmonitor.dto;

public class CreateChannelWatchRequest {
    private String channel; // "t.me/name", "https://t.me/s/name", "@name" or "name"

    public String getChannel() {
        return channel;
    }

    public void setChannel(String channel) {
        this.channel = channel;
    }
}
