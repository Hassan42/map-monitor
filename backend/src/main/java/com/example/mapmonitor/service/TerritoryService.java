package com.example.mapmonitor.service;

import java.time.LocalDateTime;
import com.example.mapmonitor.dto.TerritoryStateDto;
import com.example.mapmonitor.dto.TerritorySummaryResponse;
import com.example.mapmonitor.model.MapVersion;
import com.example.mapmonitor.model.Territory;
import com.example.mapmonitor.model.TerritoryState;
import com.example.mapmonitor.repository.TerritoryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;

@Service
public class TerritoryService extends MapElementService<Territory> {

    private final TerritoryRepository territoryRepository;
    private final MapService mapService;
    private final LayerService layerService;

    public TerritoryService(TerritoryRepository territoryRepository, MapService mapService, LayerService layerService) {
        this.territoryRepository = territoryRepository;
        this.mapService = mapService;
        this.layerService = layerService;
    }

    public TerritorySummaryResponse toResponse(Territory territory) {
        return TerritorySummaryResponse.from(territory);
    }

    // replaces the territory's states with `history`: clear + add, so orphanRemoval deletes the old rows
    private void applyHistory(Territory territory, List<TerritoryStateDto> history) {
        List<TerritoryStateDto> states = history == null ? List.of() : history;
        if (states.stream().anyMatch(s -> s.from() == null || s.points() == null || s.points().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Every history entry needs from and points");
        }
        territory.getHistory().clear();
        for (TerritoryStateDto s : states.stream().sorted(Comparator.comparing(TerritoryStateDto::from)).toList()) {
            TerritoryState state = new TerritoryState();
            state.setTerritory(territory);
            state.setValidFrom(s.from());
            state.setPoints(s.points());
            state.setFactionId(s.factionId());
            state.setColor(s.color());
            territory.getHistory().add(state);
        }
    }

    public List<TerritorySummaryResponse> getTerritoriesForMap(String firebaseUid, Long mapId, boolean draft) {
        MapVersion version = mapService.resolveVersion(firebaseUid, mapId, draft);

        return getVisible(version).stream()
                .map(this::toResponse)
                .toList();
    }

    public Territory createTerritory(String firebaseUid, Long mapId, String name, String color, String points, Long factionId,
                                     List<TerritoryStateDto> history, LocalDateTime endTime, Long layerId) {
        MapVersion draft = mapService.resolveVersion(firebaseUid, mapId, true);

        Territory territory = new Territory();
        territory.setName(name);
        territory.setColor(color);
        territory.setPoints(points);
        territory.setFactionId(factionId);
        territory.setLayer(layerService.findLayerOfMap(mapId, layerId));
        applyHistory(territory, history);
        territory.setEndTime(endTime);
        territory.setMapVersion(draft);
        Territory saved = territoryRepository.save(territory);

        saved.setStableId(saved.getId());
        return territoryRepository.save(saved);
    }

    public Territory editTerritory(String firebaseUid, Long mapId, Long stableId, String name, String color, String points, Long factionId,
                                   List<TerritoryStateDto> history, LocalDateTime endTime, Long layerId) {
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
        shadow.setLayer(layerService.findLayerOfMap(mapId, layerId));
        applyHistory(shadow, history);
        shadow.setEndTime(endTime);
        return territoryRepository.save(shadow);
    }

    public Long deleteTerritory(String firebaseUid, Long mapId, Long stableId) {
        MapVersion draft = mapService.resolveVersion(firebaseUid, mapId, true);

        Territory visible = resolve(draft).get(stableId);
        if (visible == null || visible.isDeleted()) {
            throw new RuntimeException("Territory not found");
        }

        boolean inheritedFromOlderVersion = draft.getBasedOnVersion() != null
                && resolve(draft.getBasedOnVersion()).containsKey(stableId);

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
        shadow.setLayer(visible.getLayer());
        // the shadow is a new row, so it gets its own copies of the states (rows can't be shared)
        applyHistory(shadow, visible.getHistory().stream().map(TerritoryStateDto::from).toList());
        shadow.setEndTime(visible.getEndTime());
        shadow.setDeleted(true);
        territoryRepository.save(shadow);

        return stableId;
    }

    @Override
    protected List<Territory> findRows(Long versionId) {
        return territoryRepository.findByMapVersionId(versionId);
    }
}
