package com.example.mapmonitor.controller;

import com.example.mapmonitor.dto.CreateTerritoryRequest;
import com.example.mapmonitor.dto.TerritorySummaryResponse;
import com.example.mapmonitor.service.TerritoryService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/maps/{mapId}/territories")
public class TerritoryController {

    private final TerritoryService territoryService;

    public TerritoryController(TerritoryService territoryService) {
        this.territoryService = territoryService;
    }

    @GetMapping
    public List<TerritorySummaryResponse> getTerritories(Authentication authentication, @PathVariable Long mapId,
                                                           @RequestParam(defaultValue = "false") boolean draft) {
        String uid = authentication != null ? (String) authentication.getPrincipal() : null; // null for a visitor
        return territoryService.getTerritoriesForMap(uid, mapId, draft);
    }

    @PostMapping
    public TerritorySummaryResponse createTerritory(Authentication authentication, @PathVariable Long mapId, @RequestBody CreateTerritoryRequest request) {
        String uid = (String) authentication.getPrincipal();
        return territoryService.toResponse(territoryService.createTerritory(uid, mapId, request.getName(), request.getColor(), request.getPoints(), request.getFactionId(),
                request.getHistory(), request.getEndTime(), request.getLayerId()));
    }

    @PutMapping("/{stableId}")
    public TerritorySummaryResponse editTerritory(Authentication authentication, @PathVariable Long mapId, @PathVariable Long stableId,
                                    @RequestBody CreateTerritoryRequest request) {
        String uid = (String) authentication.getPrincipal();
        return territoryService.toResponse(territoryService.editTerritory(uid, mapId, stableId, request.getName(), request.getColor(), request.getPoints(), request.getFactionId(),
                request.getHistory(), request.getEndTime(), request.getLayerId()));
    }

    @DeleteMapping("/{stableId}")
    public Long deleteTerritory(Authentication authentication, @PathVariable Long mapId, @PathVariable Long stableId) {
        String uid = (String) authentication.getPrincipal();
        return territoryService.deleteTerritory(uid, mapId, stableId);
    }
}
