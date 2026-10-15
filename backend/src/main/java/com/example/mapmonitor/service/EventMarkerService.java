package com.example.mapmonitor.service;

import com.example.mapmonitor.dto.CreateEventMarkerRequest;
import com.example.mapmonitor.dto.EventMarkerSummaryResponse;
import com.example.mapmonitor.model.EventCategory;
import com.example.mapmonitor.model.EventMarker;
import com.example.mapmonitor.model.MapVersion;
import com.example.mapmonitor.repository.EventMarkerRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;

@Service
public class EventMarkerService {

    private final EventMarkerRepository eventMarkerRepository;
    private final MapService mapService;

    public EventMarkerService(EventMarkerRepository eventMarkerRepository, MapService mapService) {
        this.eventMarkerRepository = eventMarkerRepository;
        this.mapService = mapService;
    }

    public List<EventMarkerSummaryResponse> getEventsForMap(String firebaseUid, Long mapId, boolean draft) {
        MapVersion version = mapService.resolveVersion(firebaseUid, mapId, draft);

        return resolveVisibleEvents(version).stream()
                .map(EventMarkerSummaryResponse::from)
                .toList();
    }

    public EventMarker createEvent(String firebaseUid, Long mapId, CreateEventMarkerRequest request) {
        MapVersion draft = mapService.resolveVersion(firebaseUid, mapId, true);

        EventMarker event = new EventMarker();
        applyRequest(event, request);
        event.setMapVersion(draft);
        EventMarker saved = eventMarkerRepository.save(event);

        saved.setStableId(saved.getId());
        return eventMarkerRepository.save(saved);
    }

    public EventMarker editEvent(String firebaseUid, Long mapId, Long stableId, CreateEventMarkerRequest request) {
        MapVersion draft = mapService.resolveVersion(firebaseUid, mapId, true);

        EventMarker shadow = eventMarkerRepository.findByMapVersionId(draft.getId()).stream()
                .filter(e -> e.getStableId().equals(stableId))
                .findFirst()
                .orElseGet(EventMarker::new);

        shadow.setStableId(stableId);
        shadow.setMapVersion(draft);
        applyRequest(shadow, request);
        return eventMarkerRepository.save(shadow);
    }

    private void applyRequest(EventMarker event, CreateEventMarkerRequest request) {
        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setLatitude(request.getLatitude());
        event.setLongitude(request.getLongitude());
        event.setTimestamp(request.getTimestamp() != null ? request.getTimestamp() : LocalDateTime.now());
        event.setCategory(request.getCategory() != null ? request.getCategory() : EventCategory.OTHER);
        event.setFactionId(request.getFactionId());
        event.setSourceURL(request.getSourceURL());
    }

    private List<EventMarker> resolveVisibleEvents(MapVersion version) {
        var resolved = new LinkedHashMap<Long, EventMarker>();

        MapVersion current = version;
        while (current != null) {
            for (EventMarker e : eventMarkerRepository.findByMapVersionId(current.getId())) {
                resolved.putIfAbsent(e.getStableId(), e);
            }
            current = current.getBasedOnVersion();
        }

        return new ArrayList<>(resolved.values());
    }
}
