import type { Map } from 'maplibre-gl'

export const TERRAIN_SOURCE_ID = 'terrain-dem'

const TERRAIN_EXAGGERATION = 1.5 // > 1 makes the relief more pronounced
const TERRAIN_PITCH = 60 // tilt when switching 3D on: from straight above, terrain looks flat

// elevation tiles for 3D terrain: AWS Open Data terrain tiles ("terrarium" encoding), free, no key.
// Only downloaded while terrain is on
export function addTerrainSource(map: Map) {
  if (map.getSource(TERRAIN_SOURCE_ID)) return
  map.addSource(TERRAIN_SOURCE_ID, {
    type: 'raster-dem',
    tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
    encoding: 'terrarium',
    tileSize: 256,
    maxzoom: 15,
    attribution: 'Terrain: Mapzen / AWS Open Data',
  })
}

// on: lift the map to real heights and tilt the camera to show it; off: flat again, looking straight down
export function setTerrainEnabled(map: Map, enabled: boolean) {
  if (enabled) {
    map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: TERRAIN_EXAGGERATION })
    if (map.getPitch() < 10) map.easeTo({ pitch: TERRAIN_PITCH })
  } else if (map.getTerrain()) {
    map.setTerrain(null)
    map.easeTo({ pitch: 0 })
  }
}

// terrain has to be switched off before its source can be removed
export function removeTerrainSource(map: Map) {
  if (map.getTerrain()) map.setTerrain(null)
  if (map.getSource(TERRAIN_SOURCE_ID)) map.removeSource(TERRAIN_SOURCE_ID)
}
