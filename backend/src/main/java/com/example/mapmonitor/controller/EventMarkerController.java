package com.example.mapmonitor.controller;

import com.example.mapmonitor.dto.CreateEventMarkerRequest;
import com.example.mapmonitor.dto.EventMarkerSummaryResponse;
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
        String uid = authentication != null ? (String) authentication.getPrincipal() : null; // null for a visitor
        return eventMarkerService.getEventsForMap(uid, mapId, draft);
    }

    // responses are DTOs, never the entity: the entity's relations point back at the event, which
    // Jackson would follow forever, and the entity's id is the version row's id, not the stableId
    @PostMapping
    public EventMarkerSummaryResponse createEvent(Authentication authentication, @PathVariable Long mapId,
                                                  @RequestBody CreateEventMarkerRequest request) {
        String uid = (String) authentication.getPrincipal();
        return EventMarkerSummaryResponse.from(eventMarkerService.createEvent(uid, mapId, request));
    }

    @PutMapping("/{stableId}")
    public EventMarkerSummaryResponse editEvent(Authentication authentication, @PathVariable Long mapId,
                                                @PathVariable Long stableId, @RequestBody CreateEventMarkerRequest request) {
        String uid = (String) authentication.getPrincipal();
        return EventMarkerSummaryResponse.from(eventMarkerService.editEvent(uid, mapId, stableId, request));
    }

    @DeleteMapping("/{stableId}")
    public Long deleteEvent(Authentication authentication, @PathVariable Long mapId, @PathVariable Long stableId) {
        String uid = (String) authentication.getPrincipal();
        return eventMarkerService.deleteEvent(uid, mapId, stableId);
    }
}
