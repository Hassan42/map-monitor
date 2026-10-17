import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { Map, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

setWorkerUrl(workerUrl)

export type Selection =
  | { type: 'territory'; id: number }
  | { type: 'event'; id: number }
  | { type: 'annotation'; id: number }
  | null

const MapContext = createContext<{
  map: Map | null
  selected: Selection
  setSelected: Dispatch<SetStateAction<Selection>>
}>({
  map: null,
  selected: null,
  setSelected: () => {},
})

export const useMap = () => useContext(MapContext).map

export const useSelection = () => {
  const ctx = useContext(MapContext)
  return [ctx.selected, ctx.setSelected] as const
}

function MapProvider({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<Map | null>(null)
  const [selected, setSelected] = useState<Selection>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const mapInstance = new Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [0, 0],
      zoom: 2,
      // default 60; 85 lets you tilt down to nearly the horizon (above 60 MapLibre calls experimental)
      maxPitch: 85,
    })

    const resizeObserver = new ResizeObserver(() => mapInstance.resize())
    resizeObserver.observe(containerRef.current)

    mapInstance.on('load', () => setMap(mapInstance))

    return () => {
      resizeObserver.disconnect()
      mapInstance.remove()
      setMap(null)
    }
  }, [])

  return (
    <MapContext value={{ map, selected, setSelected }}>
      <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />
      {children}
    </MapContext>
  )
}

export default MapProvider
