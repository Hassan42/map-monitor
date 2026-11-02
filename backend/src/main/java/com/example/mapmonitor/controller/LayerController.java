package com.example.mapmonitor.controller;

import com.example.mapmonitor.dto.CreateLayerRequest;
import com.example.mapmonitor.dto.ImportLayersRequest;
import com.example.mapmonitor.dto.LayerSummaryResponse;
import com.example.mapmonitor.service.LayerImportService;
import com.example.mapmonitor.service.LayerService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/maps/{mapId}/layers")
public class LayerController {

    private final LayerService layerService;
    private final LayerImportService layerImportService;

    public LayerController(LayerService layerService, LayerImportService layerImportService) {
        this.layerService = layerService;
        this.layerImportService = layerImportService;
    }

    @GetMapping
    public List<LayerSummaryResponse> getLayers(Authentication authentication, @PathVariable Long mapId,
                                                @RequestParam(defaultValue = "false") boolean draft) {
        String uid = authentication != null ? (String) authentication.getPrincipal() : null; // null for a visitor
        return layerService.getLayersForMap(uid, mapId, draft);
    }

    @PostMapping
    public LayerSummaryResponse createLayer(Authentication authentication, @PathVariable Long mapId, @RequestBody CreateLayerRequest request) {
        String uid = (String) authentication.getPrincipal();
        return LayerSummaryResponse.from(layerService.addLayer(uid, mapId, request));
    }

    // copy layers (and what's in them) from another map's published version into this map's draft
    @PostMapping("/import")
    public List<LayerSummaryResponse> importLayers(Authentication authentication, @PathVariable Long mapId,
                                                   @RequestBody ImportLayersRequest request) {
        String uid = (String) authentication.getPrincipal();
        return layerImportService.importLayers(uid, mapId, request);
    }
}
