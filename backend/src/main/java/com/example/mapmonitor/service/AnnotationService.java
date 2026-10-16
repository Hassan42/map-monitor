package com.example.mapmonitor.service;

import com.example.mapmonitor.dto.AnnotationSummaryResponse;
import com.example.mapmonitor.dto.CreateAnnotationRequest;
import com.example.mapmonitor.model.Annotation;
import com.example.mapmonitor.model.MapVersion;
import com.example.mapmonitor.repository.AnnotationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AnnotationService {

    private static final double DEFAULT_SCALE = 1.0;

    private final AnnotationRepository annotationRepository;
    private final MapService mapService;

    public AnnotationService(AnnotationRepository annotationRepository, MapService mapService) {
        this.annotationRepository = annotationRepository;
        this.mapService = mapService;
    }

    public List<AnnotationSummaryResponse> getAnnotationsForMap(String firebaseUid, Long mapId, boolean draft) {
        MapVersion version = mapService.resolveVersion(firebaseUid, mapId, draft);

        return resolveVisibleAnnotations(version).stream()
                .map(AnnotationSummaryResponse::from)
                .toList();
    }

    public Annotation createAnnotation(String firebaseUid, Long mapId, CreateAnnotationRequest request) {
        MapVersion draft = mapService.resolveVersion(firebaseUid, mapId, true);

        Annotation annotation = new Annotation();
        applyRequest(annotation, request);
        annotation.setMapVersion(draft);
        Annotation saved = annotationRepository.save(annotation);

        saved.setStableId(saved.getId());
        return annotationRepository.save(saved);
    }

    public Annotation editAnnotation(String firebaseUid, Long mapId, Long stableId, CreateAnnotationRequest request) {
        MapVersion draft = mapService.resolveVersion(firebaseUid, mapId, true);

        Annotation visible = resolveAnnotations(draft).get(stableId);
        if (visible == null || visible.isDeleted()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Annotation not found");
        }

        // reuse the draft's shadow row if there is one, otherwise create a new one
        Annotation shadow = visible.getMapVersion().getId().equals(draft.getId()) ? visible : new Annotation();
        shadow.setStableId(stableId);
        shadow.setMapVersion(draft);
        applyRequest(shadow, request);
        return annotationRepository.save(shadow);
    }

    public Long deleteAnnotation(String firebaseUid, Long mapId, Long stableId) {
        MapVersion draft = mapService.resolveVersion(firebaseUid, mapId, true);

        Annotation visible = resolveAnnotations(draft).get(stableId);
        if (visible == null || visible.isDeleted()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Annotation not found");
        }

        boolean inheritedFromOlderVersion = draft.getBasedOnVersion() != null
                && resolveAnnotations(draft.getBasedOnVersion()).containsKey(stableId);

        if (!inheritedFromOlderVersion) {
            // only ever existed in this draft -- nothing to hide, just remove the row
            annotationRepository.delete(visible);
            return stableId;
        }

        // reuse the draft's shadow row if there is one, otherwise create a new one
        Annotation shadow = visible.getMapVersion().getId().equals(draft.getId()) ? visible : new Annotation();
        shadow.setStableId(stableId);
        shadow.setMapVersion(draft);
        shadow.setKind(visible.getKind());
        shadow.setGeometry(visible.getGeometry());
        shadow.setFactionId(visible.getFactionId());
        shadow.setLabel(visible.getLabel());
        shadow.setColor(visible.getColor());
        shadow.setScale(visible.getScale());
        shadow.setDeleted(true);
        annotationRepository.save(shadow);

        return stableId;
    }

    private void applyRequest(Annotation annotation, CreateAnnotationRequest request) {
        if (request.getKind() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Annotation kind is required");
        }
        if (request.getGeometry() == null || request.getGeometry().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Annotation geometry is required");
        }

        annotation.setKind(request.getKind());
        annotation.setGeometry(request.getGeometry());
        annotation.setFactionId(request.getFactionId());
        annotation.setLabel(request.getLabel());
        annotation.setColor(request.getColor());
        annotation.setScale(request.getScale() != null ? request.getScale() : DEFAULT_SCALE);
    }

    private List<Annotation> resolveVisibleAnnotations(MapVersion version) {
        return resolveAnnotations(version).values().stream()
                .filter(a -> !a.isDeleted())
                .toList();
    }

    /**
     * Newest row per stableId across the version chain, including deleted shadows.
     */
    private Map<Long, Annotation> resolveAnnotations(MapVersion version) {
        var resolved = new LinkedHashMap<Long, Annotation>();

        MapVersion current = version;
        while (current != null) {
            for (Annotation a : annotationRepository.findByMapVersionId(current.getId())) {
                resolved.putIfAbsent(a.getStableId(), a);
            }
            current = current.getBasedOnVersion();
        }

        return resolved;
    }
}
