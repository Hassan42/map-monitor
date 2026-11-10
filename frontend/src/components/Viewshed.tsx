import { useEffect, useRef, useState } from 'react'
import type { GeoJSONSource, ImageSource, Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl'
import { useMap } from '../store/MapContext'
import { MASK_COLOR, type ViewshedRequest, type ViewshedResult } from '../map/viewshed'
import type { ViewshedWorkerMessage } from '../map/viewshed.worker'

const IMAGE_SOURCE_ID = 'viewshed-image'
const IMAGE_LAYER_ID = 'viewshed-mask'
const OUTSIDE_SOURCE_ID = 'viewshed-outside'
const OUTSIDE_LAYER_ID = 'viewshed-outside'
const MARKERS_SOURCE_ID = 'viewshed-markers'
const RING_LAYER_ID = 'viewshed-ring'
const OBSERVER_LAYER_ID = 'viewshed-observer'

const DEFAULT_RANGE_KM = 10
const MAX_RANGE_KM = 50 // bigger ranges mean much more terrain to download and process
const DEFAULT_EYE_HEIGHT_M = 2
import { ACCENT } from '../styles/colors'

// lng/lat points of a circle `radius` meters around a point (for the range ring)
function circle([lng, lat]: [number, number], radius: number, points = 128): [number, number][] {
  const R = 6371000
  const φ1 = (lat * Math.PI) / 180
  const λ1 = (lng * Math.PI) / 180
  const δ = radius / R
  const ring: [number, number][] = []
  for (let i = 0; i <= points; i++) {
    const θ = (i / points) * 2 * Math.PI
    const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ))
    const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2))
    ring.push([(λ2 * 180) / Math.PI, (φ2 * 180) / Math.PI])
  }
  return ring
}

// draw (or update) a computed viewshed: the mask image over the circle's square, gray everywhere
// else on the map, the range ring and the observer's point. Added last, so on top of everything
function drawViewshed(map: MapLibreMap, result: ViewshedResult, request: ViewshedRequest) {
  const canvas = document.createElement('canvas')
  canvas.width = result.width
  canvas.height = result.height
  canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(result.pixels), result.width, result.height), 0, 0)
  const url = canvas.toDataURL()

  const imageSource = map.getSource(IMAGE_SOURCE_ID) as ImageSource | undefined
  if (imageSource) imageSource.updateImage({ url, coordinates: result.corners })
  else {
    map.addSource(IMAGE_SOURCE_ID, { type: 'image', url, coordinates: result.corners })
    map.addLayer({ id: IMAGE_LAYER_ID, type: 'raster', source: IMAGE_SOURCE_ID, paint: { 'raster-fade-duration': 0 } })
  }

  // the rest of the world, gray: a world-sized polygon with the mask's square cut out
  const outside: GeoJSON.Feature = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]],
        [...result.corners, result.corners[0]],
      ],
    },
  }
  const outsideSource = map.getSource(OUTSIDE_SOURCE_ID) as GeoJSONSource | undefined
  if (outsideSource) outsideSource.setData(outside)
  else {
    map.addSource(OUTSIDE_SOURCE_ID, { type: 'geojson', data: outside })
    const [r, g, b, a] = MASK_COLOR
    map.addLayer({
      id: OUTSIDE_LAYER_ID,
      type: 'fill',
      source: OUTSIDE_SOURCE_ID,
      paint: { 'fill-color': `rgb(${r}, ${g}, ${b})`, 'fill-opacity': a / 255, 'fill-antialias': false },
    })
  }

  const observer: [number, number] = [request.lng, request.lat]
  const markers: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: circle(observer, request.range) } },
      { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: observer } },
    ],
  }
  const markersSource = map.getSource(MARKERS_SOURCE_ID) as GeoJSONSource | undefined
  if (markersSource) markersSource.setData(markers)
  else {
    map.addSource(MARKERS_SOURCE_ID, { type: 'geojson', data: markers })
    map.addLayer({
      id: RING_LAYER_ID,
      type: 'line',
      source: MARKERS_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'LineString'],
      paint: { 'line-color': ACCENT, 'line-width': 1.5, 'line-dasharray': [3, 2] },
    })
    map.addLayer({
      id: OBSERVER_LAYER_ID,
      type: 'circle',
      source: MARKERS_SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: { 'circle-radius': 6, 'circle-color': ACCENT, 'circle-stroke-width': 2, 'circle-stroke-color': '#111111' },
    })
  }
}

function clearViewshed(map: MapLibreMap) {
  for (const id of [OBSERVER_LAYER_ID, RING_LAYER_ID, OUTSIDE_LAYER_ID, IMAGE_LAYER_ID]) {
    if (map.getLayer(id)) map.removeLayer(id)
  }
  for (const id of [MARKERS_SOURCE_ID, OUTSIDE_SOURCE_ID, IMAGE_SOURCE_ID]) {
    if (map.getSource(id)) map.removeSource(id)
  }
}

// line of sight: click a point (while `placing`) and everything that can't be seen from there -
// hidden behind terrain or beyond the range - turns gray. Works in view and edit mode, needs no backend
function Viewshed({ placing, onPlaced }: { placing: boolean; onPlaced: () => void }) {
  const map = useMap()
  const [observer, setObserver] = useState<[number, number] | null>(null)
  const [rangeKm, setRangeKm] = useState(DEFAULT_RANGE_KM)
  const [eyeHeight, setEyeHeight] = useState(DEFAULT_EYE_HEIGHT_M)
  // what's on the map now, so "calculating" is simply: the shown result isn't the latest request
  const [shownKey, setShownKey] = useState<string | null>(null)
  const [groundHeight, setGroundHeight] = useState<number | null>(null)
  const [error, setError] = useState('')

  const workerRef = useRef<Worker | null>(null)
  const latestIdRef = useRef(0)
  // the request the worker is working on (read when its answer arrives)
  const pendingRef = useRef<ViewshedRequest | null>(null)

  const request: ViewshedRequest | null = observer
    ? { lng: observer[0], lat: observer[1], range: rangeKm * 1000, observerHeight: eyeHeight }
    : null
  const requestKey = request ? JSON.stringify(request) : null
  const calculating = requestKey != null && requestKey !== shownKey && !error

  // the worker, once per map; drawing happens when its answer arrives
  useEffect(() => {
    if (!map) return
    const worker = new Worker(new URL('../map/viewshed.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    worker.onmessage = (e: MessageEvent<{ id: number; result?: ViewshedResult; error?: string }>) => {
      const { id, result, error: message } = e.data
      if (id !== latestIdRef.current) return // an older request, already replaced
      const pending = pendingRef.current
      if (message || !result || !pending) {
        setError('Could not calculate the line of sight')
        return
      }
      drawViewshed(map, result, pending)
      setGroundHeight(result.groundHeight)
      setShownKey(JSON.stringify(pending))
    }
    return () => {
      worker.terminate()
      workerRef.current = null
      clearViewshed(map)
    }
  }, [map])

  // (re)calculate whenever the point, range or eye height changes
  useEffect(() => {
    if (!requestKey || !workerRef.current) return
    const next = JSON.parse(requestKey) as ViewshedRequest
    pendingRef.current = next
    latestIdRef.current += 1
    workerRef.current.postMessage({ id: latestIdRef.current, request: next } satisfies ViewshedWorkerMessage)
  }, [requestKey])

  // placing: crosshair; the next map click sets the observer, right-click cancels
  useEffect(() => {
    if (!map || !placing) return
    const container = map.getContainer()
    container.classList.add('viewshed-placing')

    const handleClick = (e: MapMouseEvent) => {
      setError('')
      setObserver([e.lngLat.lng, e.lngLat.lat])
      onPlaced()
    }
    const handleCancel = (e: MapMouseEvent) => {
      e.preventDefault()
      onPlaced()
    }
    map.on('click', handleClick)
    map.on('contextmenu', handleCancel)
    return () => {
      container.classList.remove('viewshed-placing')
      map.off('click', handleClick)
      map.off('contextmenu', handleCancel)
    }
  }, [map, placing, onPlaced])

  const clear = () => {
    if (map) clearViewshed(map)
    setObserver(null)
    setShownKey(null)
    setGroundHeight(null)
    setError('')
  }

  if (!observer && !placing) return null

  return (
    // top center over the map area (the property panel takes the right 24rem); phones: across the screen
    <div className="fixed top-20 left-[calc((100%-24rem)/2)] max-md:inset-x-2 max-md:translate-x-0 max-md:flex-wrap z-40 flex -translate-x-1/2 items-center gap-3 bg-neutral-900 px-4 py-2 text-sm text-gray-300 shadow-xl ring-1 ring-white/10">
      <span className="font-semibold text-white">Line of sight</span>

      {!observer ? (
        <span className="text-gray-400"><span className="md:hidden">Tap</span><span className="max-md:hidden">Click</span> the map to place the observer<span className="max-md:hidden"> (right-click cancels)</span></span>
      ) : (
        <>
          <NumberField label="Range" unit="km" value={rangeKm} min={0.1} max={MAX_RANGE_KM} onChange={setRangeKm} />
          <NumberField label="Eye height" unit="m" value={eyeHeight} min={0} max={10000} onChange={setEyeHeight} />
          <span className="w-32 text-xs text-gray-500">
            {error || (calculating ? 'Calculating…' : groundHeight != null ? `Ground ${Math.round(groundHeight)} m` : '')}
          </span>
          <button type="button" onClick={clear} className="px-2 py-1 transition-colors hover:bg-accent-400/15 hover:text-accent-300">
            Clear
          </button>
        </>
      )}
    </div>
  )
}

// small number input: typing is free, the value is applied (clamped) on Enter or leaving the box
function NumberField({ label, unit, value, min, max, onChange }: {
  label: string
  unit: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  const [text, setText] = useState(String(value))
  const apply = () => {
    const parsed = Number(text)
    if (text.trim() === '' || Number.isNaN(parsed)) {
      setText(String(value))
      return
    }
    const clamped = Math.min(max, Math.max(min, parsed))
    setText(String(clamped))
    if (clamped !== value) onChange(clamped)
  }
  return (
    <label className="flex items-center gap-1.5">
      {label}
      <input
        type="number"
        value={text}
        min={min}
        max={max}
        step="any"
        onChange={(e) => setText(e.target.value)}
        onBlur={apply}
        onKeyDown={(e) => {
          if (e.key === 'Enter') apply()
        }}
        className="w-16 bg-neutral-800 border border-neutral-700 px-2 py-1 text-gray-100 focus:outline-none focus:border-accent-400"
      />
      <span className="text-gray-500">{unit}</span>
    </label>
  )
}

export default Viewshed
