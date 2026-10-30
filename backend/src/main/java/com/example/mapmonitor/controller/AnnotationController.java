package com.example.mapmonitor.controller;

import com.example.mapmonitor.dto.AnnotationSummaryResponse;
import com.example.mapmonitor.dto.CreateAnnotationRequest;
import com.example.mapmonitor.model.Annotation;
import com.example.mapmonitor.service.AnnotationService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/maps/{mapId}/annotations")
public class AnnotationController {

    private final AnnotationService annotationService;

    public AnnotationController(AnnotationService annotationService) {
        this.annotationService = annotationService;
    }

    @GetMapping
    public List<AnnotationSummaryResponse> getAnnotations(Authentication authentication, @PathVariable Long mapId,
                                                          @RequestParam(defaultValue = "false") boolean draft) {
        String uid = authentication != null ? (String) authentication.getPrincipal() : null; // null for a visitor
        return annotationService.getAnnotationsForMap(uid, mapId, draft);
    }

    @PostMapping
    public Annotation createAnnotation(Authentication authentication, @PathVariable Long mapId, @RequestBody CreateAnnotationRequest request) {
        String uid = (String) authentication.getPrincipal();
        return annotationService.createAnnotation(uid, mapId, request);
    }

    @PutMapping("/{stableId}")
    public Annotation editAnnotation(Authentication authentication, @PathVariable Long mapId, @PathVariable Long stableId,
                                     @RequestBody CreateAnnotationRequest request) {
        String uid = (String) authentication.getPrincipal();
        return annotationService.editAnnotation(uid, mapId, stableId, request);
    }

    @DeleteMapping("/{stableId}")
    public Long deleteAnnotation(Authentication authentication, @PathVariable Long mapId, @PathVariable Long stableId) {
        String uid = (String) authentication.getPrincipal();
        return annotationService.deleteAnnotation(uid, mapId, stableId);
    }
}
