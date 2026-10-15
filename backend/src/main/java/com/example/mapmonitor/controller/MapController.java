package com.example.mapmonitor.controller;

import com.example.mapmonitor.dto.CreateMapRequest;
import com.example.mapmonitor.dto.DraftStatusResponse;
import com.example.mapmonitor.dto.MapSummaryResponse;
import com.example.mapmonitor.model.Map;
import com.example.mapmonitor.service.MapService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/maps")
public class MapController {

    private final MapService mapService;

    public MapController(MapService mapService) {
        this.mapService = mapService;
    }

    @GetMapping("/{mapId}")
    public MapSummaryResponse getMap(Authentication authentication, @PathVariable Long mapId){
        String uid = (String) authentication.getPrincipal();
        return MapSummaryResponse.from(mapService.getOwnedMap(uid, mapId));
    }

    @GetMapping
    public List<MapSummaryResponse> getUserMaps(Authentication authentication) {
        String uid = (String) authentication.getPrincipal();
        return mapService.getUserMaps(uid);
    }

    @PostMapping
    public Map createMap(Authentication authentication, @RequestBody CreateMapRequest request) {
        String uid = (String) authentication.getPrincipal();
        return mapService.createMap(uid, request.getTitle(), request.getDescription());
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

}
