import { useEffect, useRef } from 'react'
import { NavigationControl } from 'maplibre-gl'
import { useMap } from '../store/MapContext'
import { ResetViewControl } from '../map/resetViewControl'
import { boundsOf } from '../map/geometry'
import { cameraPadding } from '../map/cameraPadding'
import type { EventMarker, Territory } from '../types/types'

// MapLibre's zoom/compass buttons + our "show everything" button, top-left under the nav bar
function MapControls({ territories, events, loaded }: { territories: Territory[]; events: EventMarker[]; loaded: boolean }) {
  const map = useMap()

  // opening the map: go straight to its events (or its territories, if it has no events yet). Only once,
  // so reloading the data later, like on entering edit mode, doesn't move the camera
  const openedRef = useRef(false)
  useEffect(() => {
    if (!map || !loaded || openedRef.current) return
    openedRef.current = true
    const bounds = events.length > 0 ? boundsOf([], events) : boundsOf(territories, [])
    if (bounds) map.fitBounds(bounds, { padding: cameraPadding(), maxZoom: 12, duration: 0 })
  }, [map, loaded, events, territories])

  // the controls are added once; the reset button reads the latest data from here on click
  const dataRef = useRef({ territories, events })
  useEffect(() => {
    dataRef.current = { territories, events }
  }, [territories, events])

  useEffect(() => {
    if (!map) return
    const navigation = new NavigationControl()
    const resetView = new ResetViewControl(() => boundsOf(dataRef.current.territories, dataRef.current.events))

    map.addControl(navigation, 'top-left')
    map.addControl(resetView, 'top-left')
    return () => {
      // leaving the page, MapProvider (the parent) cleans up first and map.remove() already removes
      // every control; removing one twice crashes inside MapLibre, so only remove what's still there
      if (map.hasControl(resetView)) map.removeControl(resetView)
      if (map.hasControl(navigation)) map.removeControl(navigation)
    }
  }, [map])

  return null
}

export default MapControls
