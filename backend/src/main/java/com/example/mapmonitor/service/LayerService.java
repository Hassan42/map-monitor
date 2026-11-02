package com.example.mapmonitor.service;

import com.example.mapmonitor.dto.CreateLayerRequest;
import com.example.mapmonitor.dto.LayerSummaryResponse;
import com.example.mapmonitor.model.EventMarker;
import com.example.mapmonitor.model.Layer;
import com.example.mapmonitor.model.MapVersion;
import com.example.mapmonitor.repository.LayerRepository;
import com.example.mapmonitor.repository.MapRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class LayerService {

    private final LayerRepository layerRepository;
    private final MapService mapService;

    public LayerService(LayerRepository layerRepository, MapService mapService) {
        this.layerRepository = layerRepository;
        this.mapService = mapService;
    }

    public Layer addLayer(String firebaseUid, Long mapId, CreateLayerRequest request) {
        MapVersion draft = mapService.resolveVersion(firebaseUid, mapId, true);

        Layer layer = new Layer();
        applyRequest(layer, request);
        layer.setMapVersion(draft);

        Layer saved = layerRepository.save(layer);

        saved.setStableId(saved.getId());
        return layerRepository.save(saved);
    }

    // an imported layer's credit: the source's own credit if it was imported itself (the original
    // author stays), otherwise the source map and its owner
    public void credit(Layer target, Layer source) {
        if (source.getCreditMapId() != null) {
            target.setCreditMapId(source.getCreditMapId());
            target.setCreditMapTitle(source.getCreditMapTitle());
            target.setCreditUsername(source.getCreditUsername());
            return;
        }
        var map = source.getMapVersion().getMap();
        target.setCreditMapId(map.getId());
        target.setCreditMapTitle(map.getTitle());
        target.setCreditUsername(map.getUser().getUsername());
    }

    // the layers as of the version being viewed: draft while editing, published
    // otherwise
    public List<LayerSummaryResponse> getLayersForMap(String firebaseUid, Long mapId, boolean draft) {
        MapVersion version = mapService.resolveVersion(firebaseUid, mapId, draft);

        return getVisibleLayers(version).stream()
                .map(LayerSummaryResponse::from)
                .toList();

    }

    // the layer an element is put in, by the layer's stableId (the id the frontend gets): null for none;
    // otherwise it must be a visible layer of this version, so an element can't be put in another
    // map's layer or a deleted one
    public Layer findLayerOfMap(MapVersion version, Long layerStableId) {
        if (layerStableId == null)
            return null;
        return getVisibleLayers(version).stream()
                .filter(l -> l.getStableId().equals(layerStableId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Layer not found"));
    }

    private void applyRequest(Layer layer, CreateLayerRequest request) {
        layer.setTitle(request.getTitle());
        layer.setDescription(request.getDescription());
    }

    public List<Layer> getVisibleLayers(MapVersion version) {
        return resolveLayers(version).values().stream()
                .filter(l -> !l.isDeleted())
                .toList();
    }

    /**
     * Newest row per stableId across the version chain.
     */
    private Map<Long, Layer> resolveLayers(MapVersion version) {
        var resolved = new LinkedHashMap<Long, Layer>();

        MapVersion current = version;
        while (current != null) {
            for (Layer l : layerRepository.findByMapVersionId(current.getId())) {
                resolved.putIfAbsent(l.getStableId(), l);
            }
            current = current.getBasedOnVersion();
        }

        return resolved;
    }

}
