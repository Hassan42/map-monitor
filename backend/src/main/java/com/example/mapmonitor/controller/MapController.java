package com.example.mapmonitor.controller;

import com.example.mapmonitor.dto.*;
import com.example.mapmonitor.model.EntityType;
import com.example.mapmonitor.model.Map;
import com.example.mapmonitor.service.ChangeService;
import com.example.mapmonitor.service.MapService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/maps")
public class MapController {

    private final MapService mapService;
    private final ChangeService changeService;

    public MapController(MapService mapService, ChangeService changeService) {
        this.mapService = mapService;
        this.changeService = changeService;
    }

    // the explore page, open to visitors. A fixed path, so it doesn't clash with /{mapId}
    @GetMapping("/public")
    public List<MapSummaryResponse> getPublicMaps(Authentication authentication, @RequestParam(required = false) List<String> countries) {
        String uid = authentication != null ? (String) authentication.getPrincipal() : null;
        return mapService.getPublicMaps(uid, countries);
    }

    @GetMapping("/{mapId}")
    public MapSummaryResponse getMap(Authentication authentication, @PathVariable Long mapId){
        String uid = authentication != null ? (String) authentication.getPrincipal() : null; // null for a visitor
        return MapSummaryResponse.from(mapService.getReadableMap(uid, mapId), uid);
    }

    @GetMapping
    public List<MapSummaryResponse> getUserMaps(Authentication authentication) {
        String uid = (String) authentication.getPrincipal();
        return mapService.getUserMaps(uid);
    }

    @PostMapping
    public Map createMap(Authentication authentication, @RequestBody CreateMapRequest request) {
        String uid = (String) authentication.getPrincipal();
        return mapService.createMap(uid, request.getTitle(), request.getDescription(), request.getVisibility(), request.getCountries());
    }

    @DeleteMapping("/{mapId}")
    public Long deleteMap(Authentication authentication, @PathVariable Long mapId) {
        String uid = (String) authentication.getPrincipal();
        return mapService.deleteMap(uid, mapId);
    }

    @GetMapping("/{mapId}/draft")
    public DraftStatusResponse getDraftStatus(Authentication authentication, @PathVariable Long mapId) {
        String uid = (String) authentication.getPrincipal();
        return mapService.getDraftStatus(uid, mapId);
    }

    // everything the draft changed compared with the published map
    @GetMapping("/{mapId}/changes")
    public List<ChangeDto> getDraftChanges(Authentication authentication, @PathVariable Long mapId) {
        String uid = (String) authentication.getPrincipal();
        return changeService.getDraftChanges(uid, mapId);
    }

    // undoes the draft's change to one element (see ChangeService.discardChange)
    @DeleteMapping("/{mapId}/changes/{entityType}/{stableId}")
    public void discardChange(Authentication authentication, @PathVariable Long mapId,
                              @PathVariable EntityType entityType, @PathVariable Long stableId) {
        String uid = (String) authentication.getPrincipal();
        changeService.discardChange(uid, mapId, entityType, stableId);
    }

    @PostMapping("/{mapId}/draft")
    public void startDraft(Authentication authentication, @PathVariable Long mapId) {
        String uid = (String) authentication.getPrincipal();
        mapService.resolveVersion(uid, mapId, true);
    }

    @PostMapping("/{mapId}/publish")
    public void publish(Authentication authentication, @PathVariable Long mapId) {
        String uid = (String) authentication.getPrincipal();
        mapService.publish(uid, mapId);
    }

    @DeleteMapping("/{mapId}/draft")
    public void discardDraft(Authentication authentication, @PathVariable Long mapId) {
        String uid = (String) authentication.getPrincipal();
        mapService.discardDraft(uid, mapId);
    }

    @PatchMapping("/{mapId}/visibility")
    public void changeVisibility(Authentication authentication, @PathVariable Long mapId,
                                 @RequestBody ChangeVisibilityRequest request) {
        String uid = (String) authentication.getPrincipal();
        mapService.changeVisibility(uid, mapId, request.visibility());
    }

    @PatchMapping("/{mapId}/countries")
    public Set<String> changeCountries(Authentication authentication, @PathVariable Long mapId,
                                       @RequestBody ChangeCountriesRequest request) {
        String uid = (String) authentication.getPrincipal();
        return mapService.changeCountries(uid, mapId, request.countries());
    }

    @GetMapping("/{mapId}/monitorsCount")
    public MonitorsResponse getMonitorsCount(Authentication authentication, @PathVariable Long mapId){
        String uid = authentication != null ? (String) authentication.getPrincipal() : null; // null for a visitor
        return mapService.getMonitorsCount(uid, mapId);
    }

}
