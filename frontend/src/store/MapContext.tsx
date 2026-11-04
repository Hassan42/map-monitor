import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { Map, setWorkerUrl } from 'maplibre-gl'
import type { LngLat } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { addLongPress } from '../map/longPress'

setWorkerUrl(workerUrl)

export type Selection =
  | { type: 'territory'; id: number }
  | { type: 'event'; id: number }
  | { type: 'annotation'; id: number }
  | null

// the one right-click menu (an element's Edit / Move / Delete), opened from the map or from the property
// panel - one at a time. Each element layer shows it for its own type. lngLat: where on the map it was
// right-clicked (none when opened from the panel)
export type ContextMenu = {
  type: 'territory' | 'event' | 'annotation'
  id: number
  x: number
  y: number
  lngLat?: LngLat
} | null

const MapContext = createContext<{
  map: Map | null
  selected: Selection
  setSelected: Dispatch<SetStateAction<Selection>>
  contextMenu: ContextMenu
  setContextMenu: Dispatch<SetStateAction<ContextMenu>>
}>({
  map: null,
  selected: null,
  setSelected: () => {},
  contextMenu: null,
  setContextMenu: () => {},
})

export const useMap = () => useContext(MapContext).map

export const useSelection = () => {
  const ctx = useContext(MapContext)
  return [ctx.selected, ctx.setSelected] as const
}

export const useContextMenu = () => {
  const ctx = useContext(MapContext)
  return [ctx.contextMenu, ctx.setContextMenu] as const
}

function MapProvider({ children, collapseCredits = false }: { children: ReactNode; collapseCredits?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<Map | null>(null)
  const [selected, setSelected] = useState<Selection>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const mapInstance = new Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/bright',
      center: [0, 0],
      zoom: 2,
      // default 60; 85 lets you tilt down to nearly the horizon (above 60 MapLibre calls experimental)
      maxPitch: 85,
      // show each tile as soon as it arrives, instead of fading it in over 300ms
      fadeDuration: 0,
      // the small (i) button instead of the credits line; MapLibre opens it at first, so it's closed on load
      ...(collapseCredits ? { attributionControl: { compact: true } } : {}),
    })

    const resizeObserver = new ResizeObserver(() => mapInstance.resize())
    resizeObserver.observe(containerRef.current)

    mapInstance.on('load', () => {
      if (collapseCredits) mapInstance.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
      setMap(mapInstance)
    })
    // touch: a long press opens the same menus as a right-click
    const removeLongPress = addLongPress(mapInstance.getCanvas())

    return () => {
      removeLongPress()
      resizeObserver.disconnect()
      setMap(null)
      // React cleans up a parent before its children: removing the map right away would leave the
      // layers' own cleanups (removeEventLayers etc.) calling into a dead map, which crashes the page.
      // So the map goes once they've run
      setTimeout(() => mapInstance.remove())
    }
    // set once, when the map is made
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <MapContext value={{ map, selected, setSelected, contextMenu, setContextMenu }}>
      {/* dvh: on phones, the screen minus the browser's address bar (100vh would hide the bottom under it) */}
      <div ref={containerRef} style={{ width: '100%', height: '100dvh' }} />
      {children}
    </MapContext>
  )
}

export default MapProvider
