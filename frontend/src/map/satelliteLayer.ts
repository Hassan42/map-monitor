import type { Map } from 'maplibre-gl'

const SATELLITE_SOURCE_ID = 'esri-world-imagery'
const SATELLITE_LAYER_ID = 'esri-world-imagery'

export const SATELLITE_ATTRIBUTION = 'Esri, Maxar, Earthstar Geographics, and the GIS User Community'

// Esri World Imagery raster tiles, hidden until switched on (a hidden layer downloads no tiles). Check
// Esri's terms before a public launch: this free URL's license is unclear for commercial use
export function addSatelliteLayer(map: Map) {
  if (!map.getSource(SATELLITE_SOURCE_ID)) {
    map.addSource(SATELLITE_SOURCE_ID, {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
      attribution: SATELLITE_ATTRIBUTION,
    })
  }
  if (!map.getLayer(SATELLITE_LAYER_ID)) {
    // below the base map's labels, like the topo layer, so place names stay readable
    const firstLabelLayer = map.getStyle().layers.find((layer) => layer.type === 'symbol')?.id
    map.addLayer({ id: SATELLITE_LAYER_ID, type: 'raster', source: SATELLITE_SOURCE_ID, layout: { visibility: 'none' } }, firstLabelLayer)
  }
}

export function setSatelliteVisible(map: Map, visible: boolean) {
  if (map.getLayer(SATELLITE_LAYER_ID)) map.setLayoutProperty(SATELLITE_LAYER_ID, 'visibility', visible ? 'visible' : 'none')
}

export function removeSatelliteLayer(map: Map) {
  if (map.getLayer(SATELLITE_LAYER_ID)) map.removeLayer(SATELLITE_LAYER_ID)
  if (map.getSource(SATELLITE_SOURCE_ID)) map.removeSource(SATELLITE_SOURCE_ID)
}
