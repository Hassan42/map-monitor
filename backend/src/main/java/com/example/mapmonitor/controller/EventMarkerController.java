package com.example.mapmonitor.controller;

import com.example.mapmonitor.dto.CreateEventMarkerRequest;
import com.example.mapmonitor.dto.EventMarkerSummaryResponse;
import com.example.mapmonitor.model.EventMarker;
import com.example.mapmonitor.service.EventMarkerService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/maps/{mapId}/events")
public class EventMarkerController {

    private final EventMarkerService eventMarkerService;

    public EventMarkerController(EventMarkerService eventMarkerService) {
        this.eventMarkerService = eventMarkerService;
    }

    @GetMapping
    public List<EventMarkerSummaryResponse> getEvents(Authentication authentication, @PathVariable Long mapId,
                                                        @RequestParam(defaultValue = "false") boolean draft) {
        String uid = (String) authentication.getPrincipal();
        return eventMarkerService.getEventsForMap(uid, mapId, draft);
    }

    @PostMapping
    public EventMarker createEvent(Authentication authentication, @PathVariable Long mapId, @RequestBody CreateEventMarkerRequest request) {
        String uid = (String) authentication.getPrincipal();
        return eventMarkerService.createEvent(uid, mapId, request);
    }

    @PutMapping("/{stableId}")
    public EventMarker editEvent(Authentication authentication, @PathVariable Long mapId, @PathVariable Long stableId,
                                  @RequestBody CreateEventMarkerRequest request) {
        String uid = (String) authentication.getPrincipal();
        return eventMarkerService.editEvent(uid, mapId, stableId, request);
    }
}
