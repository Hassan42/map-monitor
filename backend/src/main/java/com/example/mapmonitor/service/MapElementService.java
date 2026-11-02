package com.example.mapmonitor.service;

import com.example.mapmonitor.model.MapElement;
import com.example.mapmonitor.model.MapVersion;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

// what every element service shares: resolving a version chain, and picking elements by layer
public abstract class MapElementService<T extends MapElement> {

    // the rows saved in exactly this version (each service asks its own repository)
    protected abstract List<T> findRows(Long versionId);

    /**
     * Newest row per stableId across the version chain, including deleted shadows.
     */
    protected Map<Long, T> resolve(MapVersion version) {
        var resolved = new LinkedHashMap<Long, T>();

        MapVersion current = version;
        while (current != null) {
            for (T row : findRows(current.getId())) {
                resolved.putIfAbsent(row.getStableId(), row);
            }
            current = current.getBasedOnVersion();
        }

        return resolved;
    }

    // the elements visible in this version: deleted shadows left out
    public List<T> getVisible(MapVersion version) {
        return resolve(version).values().stream()
                .filter(e -> !e.isDeleted())
                .toList();
    }

    // the visible elements that sit in one of these layers (by layer stableId)
    public List<T> getVisibleInLayers(MapVersion version, Set<Long> layerStableIds) {
        return getVisible(version).stream()
                .filter(e -> e.getLayer() != null && layerStableIds.contains(e.getLayer().getStableId()))
                .toList();
    }

    public List<T> getVisibleInLayer(MapVersion version, Long layerStableId) {
        return getVisibleInLayers(version, Set.of(layerStableId));
    }
}
