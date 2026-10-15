package com.example.mapmonitor.service;

import com.example.mapmonitor.dto.DraftStatusResponse;
import com.example.mapmonitor.dto.MapSummaryResponse;
import com.example.mapmonitor.model.*;
import com.example.mapmonitor.repository.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MapService {

    private final MapRepository mapRepository;
    private final UserRepository userRepository;
    private final MapVersionRepository mapVersionRepository;
    private final FactionRepository factionRepository;
    private final EventMarkerRepository eventMarkerRepository;
    private final TerritoryRepository territoryRepository;

    public MapService(MapRepository mapRepository, UserRepository userRepository, MapVersionRepository mapVersionRepository,
                       FactionRepository factionRepository, EventMarkerRepository eventMarkerRepository,
                       TerritoryRepository territoryRepository) {
        this.mapRepository = mapRepository;
        this.userRepository = userRepository;
        this.mapVersionRepository = mapVersionRepository;
        this.factionRepository = factionRepository;
        this.eventMarkerRepository = eventMarkerRepository;
        this.territoryRepository = territoryRepository;
    }

    public List<MapSummaryResponse> getUserMaps(String firebaseUid) {
        User user = userRepository.findByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return mapRepository.findByUserId(user.getId()).stream()
                .map(MapSummaryResponse::from)
                .toList();
    }

    public Map createMap(String firebaseUid, String title, String description) {
        User user = userRepository.findByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map map = new Map();
        map.setTitle(title);
        map.setDescription(description);
        map.setUser(user);
        Map savedMap = mapRepository.save(map);

        MapVersion initialVersion = new MapVersion();
        initialVersion.setMap(savedMap);
        initialVersion.setStatus(VersionStatus.PUBLISHED);
        initialVersion.setCreatedAt(LocalDateTime.now());
        MapVersion savedVersion = mapVersionRepository.save(initialVersion);

        savedMap.setPublishedVersion(savedVersion);
        return mapRepository.save(savedMap);
    }

    public Map getOwnedMap(String firebaseUid, Long mapId) {
        Map map = mapRepository.findById(mapId)
                .orElseThrow(() -> new RuntimeException("Map not found"));

        if (!map.getUser().getFirebaseUid().equals(firebaseUid)) {
            throw new AccessDeniedException("This map does not belong to you");
        }

        return map;
    }

    /**
     * Resolves which MapVersion a caller should read/write:
     * - draft=false -> the published version (must exist)
     * - draft=true  -> the current draft, creating one (based on the published version) if none exists yet
     */
    public MapVersion resolveVersion(String firebaseUid, Long mapId, boolean draft) {
        Map map = getOwnedMap(firebaseUid, mapId);

        if (!draft) {
            if (map.getPublishedVersion() == null) {
                throw new RuntimeException("Map has no published version yet");
            }
            return map.getPublishedVersion();
        }

        MapVersion existingDraft = findDraft(mapId);
        if (existingDraft != null) {
            return existingDraft;
        }

        MapVersion newDraft = new MapVersion();
        newDraft.setMap(map);
        newDraft.setStatus(VersionStatus.DRAFT);
        newDraft.setBasedOnVersion(map.getPublishedVersion());
        newDraft.setCreatedAt(LocalDateTime.now());
        return mapVersionRepository.save(newDraft);
    }

    public void publish(String firebaseUid, Long mapId) {
        Map map = getOwnedMap(firebaseUid, mapId);

        MapVersion draft = findDraft(mapId);
        if (draft == null) {
            throw new RuntimeException("No draft to publish");
        }

        MapVersion oldPublished = map.getPublishedVersion();
        if (oldPublished != null) {
            oldPublished.setStatus(VersionStatus.ARCHIVED);
            mapVersionRepository.save(oldPublished);
        }

        draft.setStatus(VersionStatus.PUBLISHED);
        mapVersionRepository.save(draft);

        map.setPublishedVersion(draft);
        mapRepository.save(map);
    }

    /**
     * Read-only: unlike resolveVersion(..., true), this never creates a draft.
     * Draft versions only hold rows that differ from the published version,
     * so any row owned by the draft is an unpublished change.
     */
    public DraftStatusResponse getDraftStatus(String firebaseUid, Long mapId) {
        getOwnedMap(firebaseUid, mapId);

        MapVersion draft = findDraft(mapId);
        if (draft == null) {
            return new DraftStatusResponse(false, false, null);
        }

        boolean hasChanges = territoryRepository.existsByMapVersionId(draft.getId())
                || factionRepository.existsByMapVersionId(draft.getId())
                || eventMarkerRepository.existsByMapVersionId(draft.getId());

        return new DraftStatusResponse(true, hasChanges, draft.getCreatedAt());
    }

    public void discardDraft(String firebaseUid, Long mapId) {
        getOwnedMap(firebaseUid, mapId);

        // deletes every DRAFT row for this map, not just one -- cleans up any duplicates
        // left behind by the race condition findDraft() otherwise has to tolerate
        List<MapVersion> drafts = mapVersionRepository.findByMapIdAndStatusOrderByCreatedAtDesc(mapId, VersionStatus.DRAFT);
        for (MapVersion draft : drafts) {
            factionRepository.deleteAll(factionRepository.findByMapVersionId(draft.getId()));
            eventMarkerRepository.deleteAll(eventMarkerRepository.findByMapVersionId(draft.getId()));
            territoryRepository.deleteAll(territoryRepository.findByMapVersionId(draft.getId()));
        }
        mapVersionRepository.deleteAll(drafts);
    }

    /**
     * Returns the most recent DRAFT version for this map, or null if none exists.
     * Uses a list + "most recent wins" instead of a single-result query because a race
     * between two concurrent "start editing" requests can create more than one draft row
     * (both check "does a draft exist?", both see no, both create one) -- this tolerates
     * that instead of crashing, but doesn't prevent it. A DB-level partial unique constraint
     * (one DRAFT per map_id) would close the race itself; not yet in place here.
     */
    private MapVersion findDraft(Long mapId) {
        List<MapVersion> drafts = mapVersionRepository.findByMapIdAndStatusOrderByCreatedAtDesc(mapId, VersionStatus.DRAFT);
        return drafts.isEmpty() ? null : drafts.get(0);
    }

    public Long deleteMap(String firebaseUid, Long mapId) {
        Map map = getOwnedMap(firebaseUid, mapId);

        List<MapVersion> versions = mapVersionRepository.findByMapId(mapId);

        for (MapVersion version : versions) {
            factionRepository.deleteAll(factionRepository.findByMapVersionId(version.getId()));
            eventMarkerRepository.deleteAll(eventMarkerRepository.findByMapVersionId(version.getId()));
            territoryRepository.deleteAll(territoryRepository.findByMapVersionId(version.getId()));
        }

        // clear FK pointers between versions/map before deleting, to avoid constraint violations
        map.setPublishedVersion(null);
        mapRepository.save(map);
        for (MapVersion version : versions) {
            version.setBasedOnVersion(null);
        }
        mapVersionRepository.saveAll(versions);

        mapVersionRepository.deleteAll(versions);
        mapRepository.delete(map);

        return mapId;
    }
}
