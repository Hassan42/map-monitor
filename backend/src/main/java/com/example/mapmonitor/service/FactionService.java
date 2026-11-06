package com.example.mapmonitor.service;

import com.example.mapmonitor.dto.FactionSummaryResponse;
import com.example.mapmonitor.model.Faction;
import com.example.mapmonitor.model.MapVersion;
import com.example.mapmonitor.repository.FactionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;

@Service
public class FactionService {

    private final FactionRepository factionRepository;
    private final MapService mapService;

    public FactionService(FactionRepository factionRepository, MapService mapService) {
        this.factionRepository = factionRepository;
        this.mapService = mapService;
    }

    public List<FactionSummaryResponse> getFactionsForMap(String firebaseUid, Long mapId, boolean draft) {
        MapVersion version = mapService.resolveVersion(firebaseUid, mapId, draft);

        return resolveVisibleFactions(version).stream()
                .map(FactionSummaryResponse::from)
                .toList();
    }

    public Faction createFaction(String firebaseUid, Long mapId, String name, String color) {
        MapVersion draft = mapService.resolveVersion(firebaseUid, mapId, true);

        Faction faction = new Faction();
        faction.setName(name);
        faction.setColor(color);
        faction.setMapVersion(draft);
        Faction saved = factionRepository.save(faction);

        saved.setStableId(saved.getId());
        return factionRepository.save(saved);
    }

    public Faction editFaction(String firebaseUid, Long mapId, Long stableId, String name, String color) {
        MapVersion draft = mapService.resolveVersion(firebaseUid, mapId, true);

        if (resolveVisibleFactions(draft).stream().noneMatch(f -> f.getStableId().equals(stableId))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Actor not found");
        }

        Faction shadow = factionRepository.findByMapVersionId(draft.getId()).stream()
                .filter(f -> f.getStableId().equals(stableId))
                .findFirst()
                .orElseGet(Faction::new);

        shadow.setStableId(stableId);
        shadow.setMapVersion(draft);
        shadow.setName(name);
        shadow.setColor(color);
        return factionRepository.save(shadow);
    }

    // the factions as of this version, newest row per stableId
    public List<Faction> getVisibleFactions(MapVersion version) {
        return resolveVisibleFactions(version);
    }

    private List<Faction> resolveVisibleFactions(MapVersion version) {
        var resolved = new LinkedHashMap<Long, Faction>();

        MapVersion current = version;
        while (current != null) {
            for (Faction f : factionRepository.findByMapVersionId(current.getId())) {
                resolved.putIfAbsent(f.getStableId(), f);
            }
            current = current.getBasedOnVersion();
        }

        return new ArrayList<>(resolved.values());
    }
}
