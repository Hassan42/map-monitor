import { useEffect } from 'react'
import { useMap } from '../store/MapContext'
import { addTerrainSource, removeTerrainSource, setTerrainEnabled } from '../map/terrainLayer'

// 3D terrain, switched on and off from the nav bar's 3D button (renders nothing).
// Must be inside <MapProvider> to get the map
function TerrainLayer({ enabled }: { enabled: boolean }) {
  const map = useMap()

  // the elevation source, once per map
  useEffect(() => {
    if (!map) return
    addTerrainSource(map)
    return () => removeTerrainSource(map)
  }, [map])

  // runs after the effect above in the same render, so the source exists by then
  useEffect(() => {
    if (map) setTerrainEnabled(map, enabled)
  }, [map, enabled])

  return null
}

export default TerrainLayer
