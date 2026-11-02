package com.example.mapmonitor.service;

import com.example.mapmonitor.dto.AnnotationSummaryResponse;
import com.example.mapmonitor.dto.CreateAnnotationRequest;
import com.example.mapmonitor.model.Annotation;
import com.example.mapmonitor.model.MapVersion;
import com.example.mapmonitor.repository.AnnotationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class AnnotationService extends MapElementService<Annotation> {

    private static final double DEFAULT_SCALE = 1.0;
    private static final double DEFAULT_ROTATION = 0.0;

    private final AnnotationRepository annotationRepository;
    private final MapService mapService;
    private final LayerService layerService;

    public AnnotationService(AnnotationRepository annotationRepository, MapService mapService, LayerService layerService) {
        this.annotationRepository = annotationRepository;
        this.mapService = mapService;
        this.layerService = layerService;
    }

    public List<AnnotationSummaryResponse> getAnnotationsForMap(String firebaseUid, Long mapId, boolean draft) {
        MapVersion version = mapService.resolveVersion(firebaseUid, mapId, draft);

        return getVisible(version).stream()
                .map(AnnotationSummaryResponse::from)
                .toList();
    }

    public Annotation createAnnotation(String firebaseUid, Long mapId, CreateAnnotationRequest request) {
        MapVersion draft = mapService.resolveVersion(firebaseUid, mapId, true);

        Annotation annotation = new Annotation();
        applyRequest(annotation, request);
        annotation.setLayer(layerService.findLayerOfMap(mapId, request.getLayerId()));
        annotation.setMapVersion(draft);
        Annotation saved = annotationRepository.save(annotation);

        saved.setStableId(saved.getId());
        return annotationRepository.save(saved);
    }

    public Annotation editAnnotation(String firebaseUid, Long mapId, Long stableId, CreateAnnotationRequest request) {
        MapVersion draft = mapService.resolveVersion(firebaseUid, mapId, true);

        Annotation visible = resolve(draft).get(stableId);
        if (visible == null || visible.isDeleted()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Annotation not found");
        }

        // reuse the draft's shadow row if there is one, otherwise create a new one
        Annotation shadow = visible.getMapVersion().getId().equals(draft.getId()) ? visible : new Annotation();
        shadow.setStableId(stableId);
        shadow.setMapVersion(draft);
        applyRequest(shadow, request);
        shadow.setLayer(layerService.findLayerOfMap(mapId, request.getLayerId()));
        return annotationRepository.save(shadow);
    }

    public Long deleteAnnotation(String firebaseUid, Long mapId, Long stableId) {
        MapVersion draft = mapService.resolveVersion(firebaseUid, mapId, true);

        Annotation visible = resolve(draft).get(stableId);
        if (visible == null || visible.isDeleted()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Annotation not found");
        }

        boolean inheritedFromOlderVersion = draft.getBasedOnVersion() != null
                && resolve(draft.getBasedOnVersion()).containsKey(stableId);

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
        shadow.setLayer(visible.getLayer());
        shadow.setLabel(visible.getLabel());
        shadow.setColor(visible.getColor());
        shadow.setScale(visible.getScale());
        shadow.setRotation(visible.getRotation());
        shadow.setStartTime(visible.getStartTime());
        shadow.setEndTime(visible.getEndTime());
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
        if (request.getStartTime() != null && request.getEndTime() != null && request.getEndTime().isBefore(request.getStartTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Annotation can't end before it starts");
        }

        annotation.setKind(request.getKind());
        annotation.setGeometry(request.getGeometry());
        annotation.setFactionId(request.getFactionId());
        annotation.setLabel(request.getLabel());
        annotation.setColor(request.getColor());
        annotation.setScale(request.getScale() != null ? request.getScale() : DEFAULT_SCALE);
        // keep it in 0..360 so the same direction is always stored the same way
        double rotation = request.getRotation() != null ? request.getRotation() : DEFAULT_ROTATION;
        annotation.setRotation(((rotation % 360) + 360) % 360);
        annotation.setStartTime(request.getStartTime());
        annotation.setEndTime(request.getEndTime());
    }

    @Override
    protected List<Annotation> findRows(Long versionId) {
        return annotationRepository.findByMapVersionId(versionId);
    }
}
