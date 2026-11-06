package com.example.mapmonitor.service;

import com.example.mapmonitor.dto.FactionSummaryResponse;
import com.example.mapmonitor.model.Faction;
import com.example.mapmonitor.model.MapVersion;
import com.example.mapmonitor.repository.FactionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class FactionService {

    private final FactionRepository factionRepository;
    private final MapService mapService;
    private final TerritoryService territoryService;
    private final EventMarkerService eventMarkerService;
    private final AnnotationService annotationService;

    public FactionService(FactionRepository factionRepository, MapService mapService, TerritoryService territoryService,
                          EventMarkerService eventMarkerService, AnnotationService annotationService) {
        this.factionRepository = factionRepository;
        this.mapService = mapService;
        this.territoryService = territoryService;
        this.eventMarkerService = eventMarkerService;
        this.annotationService = annotationService;
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

    // only an actor nothing uses can go, so no element is left pointing at a deleted one.
    // Transactional so a territory's lazy history can load
    @Transactional
    public Long deleteFaction(String firebaseUid, Long mapId, Long stableId) {
        MapVersion draft = mapService.resolveVersion(firebaseUid, mapId, true);

        Faction visible = resolveFactions(draft).get(stableId);
        if (visible == null || visible.isDeleted()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Actor not found");
        }
        if (isUsed(draft, stableId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This actor is still used");
        }

        Faction older = resolveFactions(draft.getBasedOnVersion()).get(stableId);
        if (older == null || older.isDeleted()) {
            // only ever existed in this draft -- nothing to hide, just remove the row
            factionRepository.delete(visible);
            return stableId;
        }

        // reuse the draft's shadow row if there is one, otherwise create a new one
        Faction shadow = visible.getMapVersion().getId().equals(draft.getId()) ? visible : new Faction();
        shadow.setStableId(stableId);
        shadow.setMapVersion(draft);
        shadow.setName(visible.getName());
        shadow.setColor(visible.getColor());
        shadow.setDeleted(true);
        factionRepository.save(shadow);
        return stableId;
    }

    private boolean isUsed(MapVersion version, Long factionId) {
        return territoryService.getVisible(version).stream().anyMatch(t -> factionId.equals(t.getFactionId())
                        || t.getHistory().stream().anyMatch(s -> factionId.equals(s.getFactionId())))
                || eventMarkerService.getVisible(version).stream().anyMatch(e -> factionId.equals(e.getFactionId()))
                || annotationService.getVisible(version).stream().anyMatch(a -> factionId.equals(a.getFactionId()));
    }

    // the factions as of this version, newest row per stableId
    public List<Faction> getVisibleFactions(MapVersion version) {
        return resolveVisibleFactions(version);
    }

    private List<Faction> resolveVisibleFactions(MapVersion version) {
        return resolveFactions(version).values().stream()
                .filter(f -> !f.isDeleted())
                .toList();
    }

    // newest row per stableId across the version chain, including deleted shadows
    private Map<Long, Faction> resolveFactions(MapVersion version) {
        var resolved = new LinkedHashMap<Long, Faction>();

        MapVersion current = version;
        while (current != null) {
            for (Faction f : factionRepository.findByMapVersionId(current.getId())) {
                resolved.putIfAbsent(f.getStableId(), f);
            }
            current = current.getBasedOnVersion();
        }

        return resolved;
    }
}
