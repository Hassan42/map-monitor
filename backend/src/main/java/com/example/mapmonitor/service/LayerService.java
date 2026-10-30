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


    public LayerService(LayerRepository layerRepository, MapService mapService){
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

    // the layers as of the version being viewed: draft while editing, published otherwise
    public List<LayerSummaryResponse> getLayersForMap(String firebaseUid, Long mapId, boolean draft) {
        MapVersion version = mapService.resolveVersion(firebaseUid, mapId, draft);
        return resolveLayers(version).values().stream()
                .filter(l -> !l.isDeleted())
                .map(LayerSummaryResponse::from)
                .toList();
    }

//    public Layer editLayer(String)


    // the layer an element is put in: null for none; otherwise it must exist and belong to this map
    // (an element can't be put in another map's layer)
    public Layer findLayerOfMap(Long mapId, Long layerId) {
        if (layerId == null) return null;
        Layer layer = layerRepository.findById(layerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Layer not found"));
        if (!layer.getMapVersion().getMap().getId().equals(mapId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Layer belongs to another map");
        }
        return layer;
    }

    private void applyRequest(Layer layer, CreateLayerRequest request){
        layer.setTitle(request.getTitle());
        layer.setDescription(request.getDescription());
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
