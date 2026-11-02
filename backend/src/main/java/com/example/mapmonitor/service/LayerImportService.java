package com.example.mapmonitor.service;

import com.example.mapmonitor.model.Annotation;
import com.example.mapmonitor.model.EventMarker;
import com.example.mapmonitor.model.EventRelation;
import com.example.mapmonitor.model.Faction;
import com.example.mapmonitor.model.Layer;
import com.example.mapmonitor.model.MapElement;
import com.example.mapmonitor.model.MapVersion;
import com.example.mapmonitor.model.Territory;
import com.example.mapmonitor.model.TerritoryState;

import com.example.mapmonitor.dto.ImportLayersRequest;
import com.example.mapmonitor.dto.LayerSummaryResponse;

import com.example.mapmonitor.repository.AnnotationRepository;
import com.example.mapmonitor.repository.EventMarkerRepository;
import com.example.mapmonitor.repository.FactionRepository;
import com.example.mapmonitor.repository.TerritoryRepository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

// copies layers, and everything in them, from another map's published version into a map's draft.
// The copies are new elements (own stableIds), so later edits on either map don't touch the other
@Service
public class LayerImportService {

    private final MapService mapService;
    private final LayerService layerService;
    private final FactionService factionService;
    private final FactionRepository factionRepository;
    private final EventMarkerService eventMarkerService;
    private final EventMarkerRepository eventRepository;
    private final TerritoryService territoryService;
    private final TerritoryRepository territoryRepository;
    private final AnnotationService annotationService;
    private final AnnotationRepository annotationRepository;

    public LayerImportService(MapService mapService, LayerService layerService,
                              FactionService factionService, FactionRepository factionRepository,
                              EventMarkerService eventMarkerService, EventMarkerRepository eventRepository,
                              TerritoryService territoryService, TerritoryRepository territoryRepository,
                              AnnotationService annotationService, AnnotationRepository annotationRepository) {
        this.mapService = mapService;
        this.layerService = layerService;
        this.factionService = factionService;
        this.factionRepository = factionRepository;
        this.eventMarkerService = eventMarkerService;
        this.eventRepository = eventRepository;
        this.territoryService = territoryService;
        this.territoryRepository = territoryRepository;
        this.annotationService = annotationService;
        this.annotationRepository = annotationRepository;
    }

    // all or nothing: a failure halfway leaves no half-imported layers in the draft
    @Transactional
    public List<LayerSummaryResponse> importLayers(String firebaseUid, Long mapId, ImportLayersRequest request) {
        if (request.layerIds() == null || request.layerIds().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pick at least one layer");
        }
        if (mapId.equals(request.sourceMapId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Can't import layers from the same map");
        }

        MapVersion targetMapVersion = mapService.resolveVersion(firebaseUid, mapId, true);
        MapVersion sourceMapVersion = mapService.resolveVersion(firebaseUid, request.sourceMapId(), false);

        // the requested layers (by stableId, the id the layer list sends), each once
        Set<Long> layerIds = new LinkedHashSet<>(request.layerIds());
        var sourceLayers = layerService.getVisibleLayers(sourceMapVersion).stream()
                .collect(Collectors.toMap(Layer::getStableId, Function.identity()));

        // titles already in the target, so a copy with the same name gets told apart
        Set<String> targetTitles = layerService.getVisibleLayers(targetMapVersion).stream()
                .map(Layer::getTitle)
                .collect(Collectors.toCollection(HashSet::new));

        // copy the layers: source layer stableId -> its copy in the target
        var layerIdMapping = new HashMap<Long, Layer>();
        List<LayerSummaryResponse> layerSummaries = new ArrayList<>();
        for (Long layerId : layerIds) {
            Layer sourceLayer = sourceLayers.get(layerId);
            if (sourceLayer == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Layer " + layerId + " not found in that map");
            }
            Layer newLayer = new Layer();
            String title = sourceLayer.getTitle();
            if (targetTitles.contains(title)) title = title + " (imported)";
            targetTitles.add(title); // two imported layers with the same title don't clash either
            newLayer.setTitle(title);
            newLayer.setDescription(sourceLayer.getDescription());
            layerService.credit(newLayer, sourceLayer);
            Layer savedNewLayer = layerService.saveNew(newLayer, targetMapVersion);
            layerIdMapping.put(layerId, savedNewLayer);
            layerSummaries.add(LayerSummaryResponse.from(savedNewLayer));
        }

        // what's in those layers, each type resolved once
        List<EventMarker> events = eventMarkerService.getVisibleInLayers(sourceMapVersion, layerIds);
        List<Territory> territories = territoryService.getVisibleInLayers(sourceMapVersion, layerIds);
        List<Annotation> annotations = annotationService.getVisibleInLayers(sourceMapVersion, layerIds);

        var factionIdMapping = mapFactions(events, territories, annotations, sourceMapVersion, targetMapVersion);

        // events: old stableId -> copy, so relations can point at the copies afterwards
        var eventCopies = new HashMap<Long, EventMarker>();
        for (EventMarker event : events) {
            EventMarker copy = copyMapElementsToMapVersion(event, layerIdMapping.get(event.getLayer().getStableId()),
                    eventRepository, c -> c.setFactionId(factionIdMapping.get(event.getFactionId())));
            eventCopies.put(event.getStableId(), copy);
        }
        copyRelations(events, eventCopies);

        for (Territory territory : territories) {
            copyMapElementsToMapVersion(territory, layerIdMapping.get(territory.getLayer().getStableId()),
                    territoryRepository, c -> {
                        c.setFactionId(factionIdMapping.get(territory.getFactionId()));
                        copyHistory(territory, c, factionIdMapping);
                    });
        }

        for (Annotation annotation : annotations) {
            copyMapElementsToMapVersion(annotation, layerIdMapping.get(annotation.getLayer().getStableId()),
                    annotationRepository, c -> c.setFactionId(factionIdMapping.get(annotation.getFactionId())));
        }

        return layerSummaries;
    }

    // a new element in the new layer's version, with its own stableId. `adjust` sets what copy()
    // can't know: the target's faction ids, and child rows like a territory's history
    private <T extends MapElement> T copyMapElementsToMapVersion(T element, Layer newLayer,
            JpaRepository<T, Long> repository, java.util.function.Consumer<T> adjust) {
        @SuppressWarnings("unchecked")
        T newElement = (T) element.copy();
        newElement.setMapVersion(newLayer.getMapVersion());
        newElement.setLayer(newLayer);
        adjust.accept(newElement);
        T saved = repository.save(newElement);
        saved.setStableId(saved.getId());
        return repository.save(saved);
    }

    // factions belong to a map, so each one used by the copied elements is matched in the target
    // by name (ignoring case), or copied there when the target has none by that name.
    // Returns source faction stableId -> target faction stableId
    private java.util.Map<Long, Long> mapFactions(List<EventMarker> events, List<Territory> territories,
                                                  List<Annotation> annotations, MapVersion source, MapVersion target) {
        Set<Long> used = new HashSet<>();
        events.forEach(e -> used.add(e.getFactionId()));
        annotations.forEach(a -> used.add(a.getFactionId()));
        territories.forEach(t -> {
            used.add(t.getFactionId());
            t.getHistory().forEach(s -> used.add(s.getFactionId()));
        });
        used.remove(null);

        var targetByName = new HashMap<String, Long>();
        factionService.getVisibleFactions(target).forEach(f -> targetByName.putIfAbsent(f.getName().toLowerCase(), f.getStableId()));

        var mapping = new HashMap<Long, Long>();
        for (Faction faction : factionService.getVisibleFactions(source)) {
            if (!used.contains(faction.getStableId())) continue;
            Long existing = targetByName.get(faction.getName().toLowerCase());
            if (existing == null) {
                existing = copyFaction(faction, target).getStableId();
                targetByName.put(faction.getName().toLowerCase(), existing);
            }
            mapping.put(faction.getStableId(), existing);
        }
        return mapping;
    }

    private Faction copyFaction(Faction faction, MapVersion target) {
        Faction copy = new Faction();
        copy.setName(faction.getName());
        copy.setColor(faction.getColor());
        copy.setMapVersion(target);
        Faction saved = factionRepository.save(copy);
        saved.setStableId(saved.getId());
        return factionRepository.save(saved);
    }

    // a territory's states over time, with the target's faction ids
    private void copyHistory(Territory from, Territory to, java.util.Map<Long, Long> factionIdMapping) {
        for (TerritoryState state : from.getHistory()) {
            TerritoryState copy = new TerritoryState();
            copy.setTerritory(to);
            copy.setValidFrom(state.getValidFrom());
            copy.setPoints(state.getPoints());
            copy.setColor(state.getColor());
            copy.setFactionId(factionIdMapping.get(state.getFactionId()));
            to.getHistory().add(copy);
        }
    }

    // relations between copied events, pointed at the copies; a relation to an event that wasn't
    // imported is left out
    private void copyRelations(List<EventMarker> events, java.util.Map<Long, EventMarker> eventCopies) {
        for (EventMarker event : events) {
            EventMarker copy = eventCopies.get(event.getStableId());
            for (EventRelation relation : event.getRelations()) {
                EventMarker related = eventCopies.get(relation.getRelatedEventId());
                if (related == null) continue;
                EventRelation newRelation = new EventRelation();
                newRelation.setEvent(copy);
                newRelation.setRelatedEventId(related.getStableId());
                newRelation.setType(relation.getType());
                copy.getRelations().add(newRelation);
            }
            if (!copy.getRelations().isEmpty()) eventRepository.save(copy);
        }
    }
}
