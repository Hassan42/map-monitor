import type { Map } from 'maplibre-gl'

export const TERRAIN_SOURCE_ID = 'terrain-dem'
export const HILLSHADE_SOURCE_ID = 'hillshade-dem'
export const HILLSHADE_LAYER_ID = 'hillshade'

// Mapterhorn: open worldwide elevation tiles (terrarium encoding), the same source MapLibre's
// 3D terrain example uses. Its tilejson also supplies the attribution shown on the map
const ELEVATION_TILEJSON = 'https://tiles.mapterhorn.com/tilejson.json'

const TERRAIN_EXAGGERATION = 1.5 // > 1 makes the relief more pronounced
const TERRAIN_PITCH = 60 // tilt when switching 3D on: from straight above, terrain looks flat

// two sources with the same tiles, like the MapLibre example: one lifts the map (terrain), the other
// shades it (hillshade) - keeping them separate improves render quality. Hidden / unused until 3D is
// switched on, so no tiles are downloaded before that
export function addTerrainSource(map: Map) {
  if (!map.getSource(TERRAIN_SOURCE_ID)) {
    map.addSource(TERRAIN_SOURCE_ID, { type: 'raster-dem', url: ELEVATION_TILEJSON })
  }
  if (!map.getSource(HILLSHADE_SOURCE_ID)) {
    map.addSource(HILLSHADE_SOURCE_ID, { type: 'raster-dem', url: ELEVATION_TILEJSON })
  }
  if (!map.getLayer(HILLSHADE_LAYER_ID)) {
    // below the base map's labels (and so below the topo layer's position too); our own layers stay on top
    const firstLabelLayer = map.getStyle().layers.find((layer) => layer.type === 'symbol')?.id
    map.addLayer(
      {
        id: HILLSHADE_LAYER_ID,
        type: 'hillshade',
        source: HILLSHADE_SOURCE_ID,
        layout: { visibility: 'none' },
        paint: { 'hillshade-shadow-color': '#473B24' }, // the example's warm brown shadows
      },
      firstLabelLayer,
    )
  }
}

// on: lift the map to real heights, shade the relief, and tilt the camera to show it;
// off: flat, no shading, looking straight down again
export function setTerrainEnabled(map: Map, enabled: boolean) {
  if (map.getLayer(HILLSHADE_LAYER_ID)) {
    map.setLayoutProperty(HILLSHADE_LAYER_ID, 'visibility', enabled ? 'visible' : 'none')
  }
  if (enabled) {
    map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: TERRAIN_EXAGGERATION })
    if (map.getPitch() < 10) map.easeTo({ pitch: TERRAIN_PITCH })
  } else if (map.getTerrain()) {
    map.setTerrain(null)
    map.easeTo({ pitch: 0 })
  }
}

// terrain off and the layer removed before their sources can go
export function removeTerrainSource(map: Map) {
  if (map.getTerrain()) map.setTerrain(null)
  if (map.getLayer(HILLSHADE_LAYER_ID)) map.removeLayer(HILLSHADE_LAYER_ID)
  if (map.getSource(HILLSHADE_SOURCE_ID)) map.removeSource(HILLSHADE_SOURCE_ID)
  if (map.getSource(TERRAIN_SOURCE_ID)) map.removeSource(TERRAIN_SOURCE_ID)
}
