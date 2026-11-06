package com.example.mapmonitor.controller;

import com.example.mapmonitor.dto.CreateFactionRequest;
import com.example.mapmonitor.dto.FactionSummaryResponse;
import com.example.mapmonitor.model.Faction;
import com.example.mapmonitor.service.FactionService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/maps/{mapId}/factions")
public class FactionController {

    private final FactionService factionService;

    public FactionController(FactionService factionService) {
        this.factionService = factionService;
    }

    @GetMapping
    public List<FactionSummaryResponse> getFactions(Authentication authentication, @PathVariable Long mapId,
                                                      @RequestParam(defaultValue = "false") boolean draft) {
        String uid = authentication != null ? (String) authentication.getPrincipal() : null; // null for a visitor
        return factionService.getFactionsForMap(uid, mapId, draft);
    }

    @PostMapping
    public Faction createFaction(Authentication authentication, @PathVariable Long mapId, @RequestBody CreateFactionRequest request) {
        String uid = (String) authentication.getPrincipal();
        return factionService.createFaction(uid, mapId, request.getName(), request.getColor());
    }

    @PutMapping("/{stableId}")
    public FactionSummaryResponse editFaction(Authentication authentication, @PathVariable Long mapId, @PathVariable Long stableId,
                                @RequestBody CreateFactionRequest request) {
        String uid = (String) authentication.getPrincipal();
        // the summary: its id is the stableId, which the draft's row id isn't
        return FactionSummaryResponse.from(factionService.editFaction(uid, mapId, stableId, request.getName(), request.getColor()));
    }
}
