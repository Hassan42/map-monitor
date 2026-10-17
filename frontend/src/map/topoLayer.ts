import type { Map } from 'maplibre-gl'

export const TOPO_SOURCE_ID = 'opentopomap'
export const TOPO_LAYER_ID = 'opentopomap'

// OpenTopoMap raster tiles under everything we draw: added once, hidden until switched on
// (a hidden layer downloads no tiles). Free community server: fine for light use, see its policy
export function addTopoLayer(map: Map) {
  if (!map.getSource(TOPO_SOURCE_ID)) {
    map.addSource(TOPO_SOURCE_ID, {
      type: 'raster',
      tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 17,
      attribution: '© OpenStreetMap contributors, SRTM | © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    })
  }
  if (!map.getLayer(TOPO_LAYER_ID)) {
    // below the base map's labels, so place names stay readable; our own layers are added later, so on top
    const firstLabelLayer = map.getStyle().layers.find((layer) => layer.type === 'symbol')?.id
    map.addLayer(
      {
        id: TOPO_LAYER_ID,
        type: 'raster',
        source: TOPO_SOURCE_ID,
        layout: { visibility: 'none' },
        paint: { 'raster-opacity': 0.6 },   // tone down the bright topo colors on the dark style
      },
      firstLabelLayer,
    )
  }
}

export function setTopoVisible(map: Map, visible: boolean) {
  if (map.getLayer(TOPO_LAYER_ID)) map.setLayoutProperty(TOPO_LAYER_ID, 'visibility', visible ? 'visible' : 'none')
}

export function removeTopoLayer(map: Map) {
  if (map.getLayer(TOPO_LAYER_ID)) map.removeLayer(TOPO_LAYER_ID)
  if (map.getSource(TOPO_SOURCE_ID)) map.removeSource(TOPO_SOURCE_ID)
}