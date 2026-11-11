package com.example.mapmonitor.dto;

// how many users monitor a map, and whether the caller is one of them (false for a visitor)
public record MonitorsResponse(long count, boolean monitoredByMe) {
}
