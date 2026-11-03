import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { MaplibreMeasureControl } from '@watergis/maplibre-gl-terradraw'
import type { Map } from 'maplibre-gl'
import { useMap } from './MapContext'
import { createTerraDrawControl } from '../map/territoryDraw'
import { ANNOTATIONS_SOURCE_ID, EVENTS_SOURCE_ID, RELATIONS_SOURCE_ID } from '../map/mapLayers'

// terra-draw's layers (territories, ruler lines and their labels) all start with this
const TERRA_DRAW_LAYER_PREFIX = 'td-'
// the layers that belong on top of the territories
const ON_TOP_SOURCES = [EVENTS_SOURCE_ID, RELATIONS_SOURCE_ID, ANNOTATIONS_SOURCE_ID]

// territories under events, relations and annotations. The control is added after them (a parent's effect
// runs after its children's), so its layers start out on top; and those layers can also be added later
function keepTerraDrawBelow(map: Map) {
  const layers = map.getStyle()?.layers ?? []
  const firstOnTop = layers.findIndex((l) => 'source' in l && ON_TOP_SOURCES.includes(l.source))
  if (firstOnTop === -1) return
  for (const l of layers.slice(firstOnTop)) {
    if (l.id.startsWith(TERRA_DRAW_LAYER_PREFIX)) map.moveLayer(l.id, layers[firstOnTop].id)
  }
}

// the map's one terra-draw control, shared by the territory layer and the ruler
const TerraDrawContext = createContext<MaplibreMeasureControl | null>(null)

// must be inside <MapProvider>: creates the control once the map exists; it stays alive in view and edit mode
function TerraDrawProvider({ children }: { children: ReactNode }) {
  const map = useMap()
  const [draw, setDraw] = useState<MaplibreMeasureControl | null>(null)

  useEffect(() => {
    if (!map) return
    const control = createTerraDrawControl(map)
    map.addControl(control, 'bottom-left')
    // starts terra-draw and adds the measure label layers and listeners
    control.activate()
    keepTerraDrawBelow(map)
    // moves only when out of order, so the styledata its own moves fire is a no-op
    const reorder = () => keepTerraDrawBelow(map)
    map.on('styledata', reorder)
    // shared only once it's on the map: before that it has no terra-draw instance to listen to
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraw(control)
    return () => {
      map.off('styledata', reorder)
      setDraw(null)
      // map.remove() (MapProvider, on leaving the page) may have removed it already
      if (map.hasControl(control)) map.removeControl(control)
    }
  }, [map])

  return <TerraDrawContext.Provider value={draw}>{children}</TerraDrawContext.Provider>
}

export const useTerraDraw = () => useContext(TerraDrawContext)

export default TerraDrawProvider
