package com.example.mapmonitor.service;

import com.example.mapmonitor.dto.AnnotationSummaryResponse;
import com.example.mapmonitor.dto.ChangeDto;
import com.example.mapmonitor.dto.ElementSummary;
import com.example.mapmonitor.dto.EventMarkerSummaryResponse;
import com.example.mapmonitor.dto.LayerSummaryResponse;
import com.example.mapmonitor.dto.TerritorySummaryResponse;
import com.example.mapmonitor.model.ChangeAction;
import com.example.mapmonitor.model.EntityType;
import com.example.mapmonitor.model.Layer;
import com.example.mapmonitor.model.MapElement;
import com.example.mapmonitor.model.MapVersion;
import com.example.mapmonitor.repository.AnnotationRepository;
import com.example.mapmonitor.repository.EventMarkerRepository;
import com.example.mapmonitor.repository.LayerRepository;
import com.example.mapmonitor.repository.TerritoryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.function.Function;

/**
 * The draft's changes against the published map, and undoing one. A draft only holds rows that differ
 * from the version it's based on, so every draft row is a change: a deleted shadow is DELETED, a stableId
 * the base doesn't have is ADDED, anything else is MODIFIED.
 */
@Service
public class ChangeService {

    private final MapService mapService;
    private final TerritoryRepository territoryRepository;
    private final EventMarkerRepository eventMarkerRepository;
    private final AnnotationRepository annotationRepository;
    private final LayerRepository layerRepository;

    public ChangeService(MapService mapService, TerritoryRepository territoryRepository,
                         EventMarkerRepository eventMarkerRepository, AnnotationRepository annotationRepository,
                         LayerRepository layerRepository) {
        this.mapService = mapService;
        this.territoryRepository = territoryRepository;
        this.eventMarkerRepository = eventMarkerRepository;
        this.annotationRepository = annotationRepository;
        this.layerRepository = layerRepository;
    }

    // read-only, and like getDraftStatus it never creates a draft: no draft means no changes.
    // Transactional so lazy collections (a territory's history) can load while building the DTOs
    @Transactional(readOnly = true)
    public List<ChangeDto> getDraftChanges(String firebaseUid, Long mapId) {
        mapService.getOwnedMap(firebaseUid, mapId);

        MapVersion draft = mapService.findDraft(mapId);
        if (draft == null) {
            return List.of();
        }

        return changesOfVersion(draft);
    }

    // undoes the draft's change to one element: removes the draft's row for it, so the element falls back to
    // the published one - an added element disappears, a modified one reverts, a deleted one comes back.
    // A draft has one row per element, so this undoes all of the draft's edits to it at once
    @Transactional
    public void discardChange(String firebaseUid, Long mapId, EntityType type, Long stableId) {
        mapService.getOwnedMap(firebaseUid, mapId);

        MapVersion draft = mapService.findDraft(mapId);
        if (draft == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No draft");
        }

        switch (type) {
            case TERRITORY -> discard(draft, territoryRepository::findByMapVersionId, territoryRepository::delete, stableId);
            case EVENT -> discard(draft, eventMarkerRepository::findByMapVersionId, eventMarkerRepository::delete, stableId);
            case ANNOTATION -> discard(draft, annotationRepository::findByMapVersionId, annotationRepository::delete, stableId);
            case LAYER -> discardLayer(draft, stableId);
        }
    }

    // a layer isn't a MapElement, so it has its own discard. The draft's elements may sit in the draft's layer
    // row: they're taken out of it first (no layer), or the foreign key would block the delete
    private void discardLayer(MapVersion draft, Long stableId) {
        Layer row = layerRepository.findByMapVersionId(draft.getId()).stream()
                .filter(l -> l.getStableId().equals(stableId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "The draft has no change to this layer"));

        leaveLayer(draft, territoryRepository::findByMapVersionId, row);
        leaveLayer(draft, eventMarkerRepository::findByMapVersionId, row);
        leaveLayer(draft, annotationRepository::findByMapVersionId, row);
        layerRepository.delete(row); // Hibernate flushes the elements' updates before this delete
    }

    private <T extends MapElement> void leaveLayer(MapVersion draft, Function<Long, List<T>> rows, Layer layer) {
        for (T element : rows.apply(draft.getId())) {
            // by row id, not stableId: only elements in this draft row lose their layer
            if (element.getLayer() != null && layer.getId().equals(element.getLayer().getId())) element.setLayer(null);
        }
    }

    private <T extends MapElement> void discard(MapVersion draft, Function<Long, List<T>> rows, Consumer<T> delete, Long stableId) {
        T row = rows.apply(draft.getId()).stream()
                .filter(r -> r.getStableId().equals(stableId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "The draft has no change to this element"));
        delete.accept(row);
    }

    // what one version changed against its base (the first version has none, so everything in it is ADDED)
    private List<ChangeDto> changesOfVersion(MapVersion version) {
        List<ChangeDto> changes = new ArrayList<>();
        changes.addAll(changesOf(version, territoryRepository::findByMapVersionId, TerritorySummaryResponse::from));
        changes.addAll(changesOf(version, eventMarkerRepository::findByMapVersionId, EventMarkerSummaryResponse::from));
        changes.addAll(changesOf(version, annotationRepository::findByMapVersionId, AnnotationSummaryResponse::from));
        changes.addAll(layerChanges(version));
        return changes;
    }

    // changesOf for layers, which aren't MapElements: same rules, by stableId against the version's base
    private List<ChangeDto> layerChanges(MapVersion version) {
        var published = new LinkedHashMap<Long, Layer>();
        for (MapVersion current = version.getBasedOnVersion(); current != null; current = current.getBasedOnVersion()) {
            for (Layer row : layerRepository.findByMapVersionId(current.getId())) {
                published.putIfAbsent(row.getStableId(), row);
            }
        }

        return layerRepository.findByMapVersionId(version.getId()).stream()
                .map(row -> {
                    Layer before = published.get(row.getStableId());
                    if (before != null && before.isDeleted()) before = null; // deleted earlier: it's new again
                    ChangeAction action = row.isDeleted() ? ChangeAction.DELETED
                            : before == null ? ChangeAction.ADDED
                            : ChangeAction.MODIFIED;
                    return new ChangeDto(
                            EntityType.LAYER,
                            row.getStableId(),
                            action,
                            row.getTitle(),
                            before == null ? null : LayerSummaryResponse.from(before),
                            row.isDeleted() ? null : LayerSummaryResponse.from(row));
                })
                .toList();
    }

    // the changes of one element type: `rows` finds a version's own rows, `toDto` is the type's summary response
    private <T extends MapElement> List<ChangeDto> changesOf(MapVersion version, Function<Long, List<T>> rows,
                                                             Function<T, ElementSummary> toDto) {
        Map<Long, T> published = resolve(version.getBasedOnVersion(), rows);

        return rows.apply(version.getId()).stream()
                .map(row -> {
                    T before = published.get(row.getStableId());
                    if (before != null && before.isDeleted()) before = null; // deleted earlier: it's new again
                    ChangeAction action = row.isDeleted() ? ChangeAction.DELETED
                            : before == null ? ChangeAction.ADDED
                            : ChangeAction.MODIFIED;
                    return new ChangeDto(
                            row.entityType(),
                            row.getStableId(),
                            action,
                            row.displayName(),
                            before == null ? null : toDto.apply(before),
                            row.isDeleted() ? null : toDto.apply(row));
                })
                .toList();
    }

    // newest row per stableId across the version chain, including deleted shadows (as the element services do)
    private <T extends MapElement> Map<Long, T> resolve(MapVersion version, Function<Long, List<T>> rows) {
        var resolved = new LinkedHashMap<Long, T>();
        for (MapVersion current = version; current != null; current = current.getBasedOnVersion()) {
            for (T row : rows.apply(current.getId())) {
                resolved.putIfAbsent(row.getStableId(), row);
            }
        }
        return resolved;
    }
}
