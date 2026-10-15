package com.example.mapmonitor.service;

import com.example.mapmonitor.dto.TerritorySummaryResponse;
import com.example.mapmonitor.model.MapVersion;
import com.example.mapmonitor.model.Territory;
import com.example.mapmonitor.repository.TerritoryRepository;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class TerritoryService {

    private final TerritoryRepository territoryRepository;
    private final MapService mapService;

    public TerritoryService(TerritoryRepository territoryRepository, MapService mapService) {
        this.territoryRepository = territoryRepository;
        this.mapService = mapService;
    }

    public List<TerritorySummaryResponse> getTerritoriesForMap(String firebaseUid, Long mapId, boolean draft) {
        MapVersion version = mapService.resolveVersion(firebaseUid, mapId, draft);

        return resolveVisibleTerritories(version).stream()
                .map(TerritorySummaryResponse::from)
                .toList();
    }

    public Territory createTerritory(String firebaseUid, Long mapId, String name, String color, String points, Long factionId) {
        MapVersion draft = mapService.resolveVersion(firebaseUid, mapId, true);

        Territory territory = new Territory();
        territory.setName(name);
        territory.setColor(color);
        territory.setPoints(points);
        territory.setFactionId(factionId);
        territory.setMapVersion(draft);
        Territory saved = territoryRepository.save(territory);

        saved.setStableId(saved.getId());
        return territoryRepository.save(saved);
    }

    public Territory editTerritory(String firebaseUid, Long mapId, Long stableId, String name, String color, String points, Long factionId) {
        MapVersion draft = mapService.resolveVersion(firebaseUid, mapId, true);

        Territory shadow = territoryRepository.findByMapVersionId(draft.getId()).stream()
                .filter(t -> t.getStableId().equals(stableId))
                .findFirst()
                .orElseGet(Territory::new);

        if (shadow.isDeleted()) {
            throw new RuntimeException("Territory not found");
        }

        shadow.setStableId(stableId);
        shadow.setMapVersion(draft);
        shadow.setName(name);
        shadow.setColor(color);
        shadow.setPoints(points);
        shadow.setFactionId(factionId);
        return territoryRepository.save(shadow);
    }

    public Long deleteTerritory(String firebaseUid, Long mapId, Long stableId) {
        MapVersion draft = mapService.resolveVersion(firebaseUid, mapId, true);

        Territory visible = resolveTerritories(draft).get(stableId);
        if (visible == null || visible.isDeleted()) {
            throw new RuntimeException("Territory not found");
        }

        boolean inheritedFromOlderVersion = draft.getBasedOnVersion() != null
                && resolveTerritories(draft.getBasedOnVersion()).containsKey(stableId);

        if (!inheritedFromOlderVersion) {
            // only ever existed in this draft -- nothing to hide, just remove the row
            territoryRepository.delete(visible);
            return stableId;
        }

        // reuse the draft's shadow row if there is one, otherwise create a new one
        Territory shadow = visible.getMapVersion().getId().equals(draft.getId()) ? visible : new Territory();
        shadow.setStableId(stableId);
        shadow.setMapVersion(draft);
        shadow.setName(visible.getName());
        shadow.setColor(visible.getColor());
        shadow.setPoints(visible.getPoints());
        shadow.setFactionId(visible.getFactionId());
        shadow.setDeleted(true);
        territoryRepository.save(shadow);

        return stableId;
    }

    private List<Territory> resolveVisibleTerritories(MapVersion version) {
        return resolveTerritories(version).values().stream()
                .filter(t -> !t.isDeleted())
                .toList();
    }

    /**
     * Newest row per stableId across the version chain, including deleted shadows.
     */
    private Map<Long, Territory> resolveTerritories(MapVersion version) {
        var resolved = new LinkedHashMap<Long, Territory>();

        MapVersion current = version;
        while (current != null) {
            for (Territory t : territoryRepository.findByMapVersionId(current.getId())) {
                resolved.putIfAbsent(t.getStableId(), t);
            }
            current = current.getBasedOnVersion();
        }

        return resolved;
    }
}
