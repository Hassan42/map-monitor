package com.example.mapmonitor.dto;

import java.util.List;

public record ProfileResponse(String username, String description, boolean owned, List<MapSummaryResponse> maps) {
}
