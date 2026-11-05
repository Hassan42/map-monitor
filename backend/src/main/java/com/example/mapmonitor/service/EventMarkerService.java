package com.example.mapmonitor.service;

import com.example.mapmonitor.dto.CreateEventMarkerRequest;
import com.example.mapmonitor.dto.EventMarkerSummaryResponse;
import com.example.mapmonitor.dto.EventRelationDto;
import com.example.mapmonitor.model.EventCategory;
import com.example.mapmonitor.model.EventMarker;
import com.example.mapmonitor.model.EventRelation;
import com.example.mapmonitor.model.MapVersion;
import com.example.mapmonitor.repository.EventMarkerRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class EventMarkerService extends MapElementService<EventMarker> {

    private static final int DEFAULT_VISIBLE_DAYS = 7;
    // a browser clock a little ahead of the server's shouldn't make "now" count as the future
    private static final Duration CLOCK_TOLERANCE = Duration.ofMinutes(5);

    private final EventMarkerRepository eventMarkerRepository;
    private final MapService mapService;
    private final LayerService layerService;

    public EventMarkerService(EventMarkerRepository eventMarkerRepository, MapService mapService, LayerService layerService) {
        this.eventMarkerRepository = eventMarkerRepository;
        this.mapService = mapService;
        this.layerService = layerService;
    }

    public List<EventMarkerSummaryResponse> getEventsForMap(String firebaseUid, Long mapId, boolean draft) {
        MapVersion version = mapService.resolveVersion(firebaseUid, mapId, draft);

        return getVisible(version).stream()
                .map(EventMarkerSummaryResponse::from)
                .toList();
    }

    public EventMarker createEvent(String firebaseUid, Long mapId, CreateEventMarkerRequest request) {
        MapVersion draft = mapService.resolveVersion(firebaseUid, mapId, true);

        EventMarker event = new EventMarker();
        applyRequest(event, request);
        event.setLayer(layerService.findLayerOfMap(draft, request.getLayerId()));
        event.setMapVersion(draft);
        EventMarker saved = eventMarkerRepository.save(event);

        saved.setStableId(saved.getId());
        return eventMarkerRepository.save(saved);
    }

    public EventMarker editEvent(String firebaseUid, Long mapId, Long stableId, CreateEventMarkerRequest request) {
        MapVersion draft = mapService.resolveVersion(firebaseUid, mapId, true);

        EventMarker visible = resolve(draft).get(stableId);
        if (visible == null || visible.isDeleted()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found");
        }

        EventMarker shadow = eventMarkerRepository.findByMapVersionId(draft.getId()).stream()
                .filter(e -> e.getStableId().equals(stableId))
                .findFirst()
                .orElseGet(EventMarker::new);

        if (shadow.getId() == null) {
            shadow.setStableId(stableId);
            shadow.setMapVersion(draft);
        }

        applyRequest(shadow, request);
        shadow.setLayer(layerService.findLayerOfMap(draft, request.getLayerId()));
        return eventMarkerRepository.save(shadow);
    }

    public Long deleteEvent(String firebaseUid, Long mapId, Long stableId) {
        MapVersion draft = mapService.resolveVersion(firebaseUid, mapId, true);

        EventMarker visible = resolve(draft).get(stableId);
        if (visible == null || visible.isDeleted()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found");
        }

        boolean inheritedFromOlderVersion = draft.getBasedOnVersion() != null
                && resolve(draft.getBasedOnVersion()).containsKey(stableId);

        if (!inheritedFromOlderVersion) {
            // only ever existed in this draft -- nothing to hide, just remove the row (and its relations)
            eventMarkerRepository.delete(visible);
            return stableId;
        }

        // reuse the draft's shadow row if there is one, otherwise create a new one
        EventMarker shadow = visible.getMapVersion().getId().equals(draft.getId()) ? visible : new EventMarker();
        shadow.setStableId(stableId);
        shadow.setMapVersion(draft);
        shadow.setTitle(visible.getTitle());
        shadow.setDescription(visible.getDescription());
        shadow.setLatitude(visible.getLatitude());
        shadow.setLongitude(visible.getLongitude());
        shadow.setTimestamp(visible.getTimestamp());
        shadow.setCategory(visible.getCategory());
        shadow.setFactionId(visible.getFactionId());
        shadow.setLayer(visible.getLayer());
        shadow.setSourceURL(visible.getSourceURL());
        shadow.setEndTime(visible.getEndTime());
        shadow.setOngoing(visible.isOngoing());
        shadow.setVisibleDays(visible.getVisibleDays());
        shadow.getRelations().clear(); // a deleted event relates to nothing
        shadow.setDeleted(true);
        eventMarkerRepository.save(shadow);

        return stableId;
    }

    private void applyRequest(EventMarker event, CreateEventMarkerRequest request) {
        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setLatitude(request.getLatitude());
        event.setLongitude(request.getLongitude());
        // times are UTC (the frontend sends ISO strings ending in Z)
        LocalDateTime nowUtc = LocalDateTime.now(ZoneOffset.UTC);
        LocalDateTime start = request.getTimestamp() != null ? request.getTimestamp() : nowUtc;
        if (start.isAfter(nowUtc.plus(CLOCK_TOLERANCE))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start time can't be in the future");
        }
        LocalDateTime end = request.isOngoing() ? null : request.getEndTime();
        if (end != null && end.isBefore(start)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End time can't be before the start");
        }
        int visibleDays = request.getVisibleDays() != null ? request.getVisibleDays() : DEFAULT_VISIBLE_DAYS;
        if (visibleDays < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Visible days must be at least 1");
        }
        event.setTimestamp(start);
        event.setEndTime(end);
        event.setOngoing(request.isOngoing());
        event.setVisibleDays(visibleDays);
        event.setCategory(request.getCategory() != null ? request.getCategory() : EventCategory.OTHER);
        event.setFactionId(request.getFactionId());
        // only real web links: a "javascript:" address would run as a script when someone clicks it
        String url = request.getSourceURL();
        if (url != null && !url.isBlank() && !url.matches("(?i)^https?://.*")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Source must start with http:// or https://");
        }
        event.setSourceURL(url);

        event.getRelations().clear();
        for (EventRelationDto r : request.getRelations()) {
            EventRelation relation = new EventRelation();
            relation.setEvent(event);
            relation.setRelatedEventId(r.getRelatedEventId());
            relation.setType(r.getType());
            event.getRelations().add(relation);
        }
    }

    @Override
    protected List<EventMarker> findRows(Long versionId) {
        return eventMarkerRepository.findByMapVersionId(versionId);
    }
}
