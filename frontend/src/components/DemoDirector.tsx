import { useEffect, useRef } from 'react'
import { Popup } from 'maplibre-gl'
import { useMap, useSelection } from '../store/MapContext'
import { categoryOf } from '../map/eventCategories'
import { createEventPopupContent } from '../map/EventPopup'
import { parseServerTime } from '../map/eventTime'
import { boundsOf } from '../map/geometry'
import type { EventMarker } from '../types/types'

const MAX_SCENES = 16
const FLIGHT_MS = 3200 // jumping to an event
const ORBIT_MS = 4000 // circling it with its popup open
const OVERVIEW_MS = 2200 // zooming out to the whole area
const OVERVIEW_EVERY = 4 // scenes between zoom-outs
const OVERVIEW_PAUSE_MS = 1500
const CLOCK_TICK_MS = 120
const MAX_START_WAIT_MS = 4000
const SCENE_ZOOMS = [10, 9.2, 10.6, 9.6]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// the scenes: in date order from `from` on, without Death events, at most MAX_SCENES spread evenly
function pickScenes(events: EventMarker[], from: number) {
  const sorted = events
    .filter((e) => categoryOf(e) !== 'DEATH' && parseServerTime(e.timestamp) >= from)
    .sort((a, b) => parseServerTime(a.timestamp) - parseServerTime(b.timestamp))
  if (sorted.length <= MAX_SCENES) return sorted
  return Array.from({ length: MAX_SCENES }, (_, i) => sorted[Math.round((i * (sorted.length - 1)) / (MAX_SCENES - 1))])
}

// the landing page's demo (?demo on the map page): drives the real page like a film. It only moves the
// camera, the timeline's date and the selection, as a visitor would; everything drawn is the app's own
function DemoDirector({ events, loaded, from, to, restart, onTime, instant = false }: {
  events: EventMarker[]
  loaded: boolean
  from: number
  to?: number // the timeline's end: after the last scene the date runs on to it, then starts over
  restart?: number // where the later rounds start (default `from`)
  onTime: (time: number) => void
  instant?: boolean // director mode: the map is already showing, so start without the opening waits
}) {
  const map = useMap()
  const [, setSelected] = useSelection()
  const onTimeRef = useRef(onTime)
  useEffect(() => {
    onTimeRef.current = onTime
  }, [onTime])

  useEffect(() => {
    if (!map || !loaded) return
    const firstScenes = pickScenes(events, from)
    const laterScenes = restart === undefined ? firstScenes : pickScenes(events, restart)
    if (firstScenes.length === 0 && laterScenes.length === 0) return
    let stopped = false
    let popup: Popup | null = null
    let clockTimer: ReturnType<typeof setInterval> | undefined

    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // the demo has no nav bar or property panel: only the timeline to keep clear of
    const padding = { top: 30, right: 30, bottom: 190, left: 30 }
    // everywhere the scenes happen
    const overview = boundsOf([], laterScenes.length > 0 ? laterScenes : firstScenes)

    const move = (start: () => void) =>
      new Promise<void>((resolve) => {
        map.once('moveend', () => resolve())
        start()
      })
    const showOverview = () =>
      overview
        ? move(() => map.fitBounds(overview, { padding, bearing: 0, pitch: 0, duration: calm ? 0 : OVERVIEW_MS, essential: false }))
        : Promise.resolve()
    // run the timeline from `start` to `end` over `ms`
    const runClock = (start: number, end: number, ms: number) => {
      clearInterval(clockTimer)
      const began = performance.now()
      clockTimer = setInterval(() => {
        const share = Math.min((performance.now() - began) / ms, 1)
        onTimeRef.current(start + (end - start) * share)
        if (share === 1) clearInterval(clockTimer)
      }, CLOCK_TICK_MS)
    }

    const play = async () => {
      let first = true
      let start = from
      let scenes = firstScenes
      while (!stopped) {
        onTimeRef.current(start)
        setSelected(null)
        // director mode: no opening zoom-out and pause on the first loop
        if (!(instant && first)) {
          await showOverview()
          await sleep(OVERVIEW_PAUSE_MS)
        }
        first = false

        let time = start
        for (let i = 0; i < scenes.length; i++) {
          if (stopped) return
          const event = scenes[i]
          popup?.remove()
          setSelected(null)
          if (i > 0 && i % OVERVIEW_EVERY === 0) {
            await showOverview()
            if (stopped) return
          }

          const eventTime = parseServerTime(event.timestamp)
          runClock(time, eventTime, FLIGHT_MS)
          time = eventTime
          const bearing = ((i * 67) % 120) - 60
          const zoom = SCENE_ZOOMS[i % SCENE_ZOOMS.length]
          await move(() => map.flyTo({ center: [event.longitude, event.latitude], zoom, pitch: calm ? 0 : 55, bearing: calm ? 0 : bearing, padding, duration: calm ? 0 : FLIGHT_MS, essential: false }))
          if (stopped) return

          // what a click on the event does: the accent ring and its popup
          clearInterval(clockTimer) // landed: the date stops exactly on the event
          onTimeRef.current(eventTime)
          setSelected({ type: 'event', id: event.id })
          popup = new Popup({ className: 'event-popup', offset: 18, closeButton: false, closeOnClick: false })
            .setLngLat([event.longitude, event.latitude])
            .setDOMContent(createEventPopupContent(event))
            .addTo(map)

          if (calm) await sleep(ORBIT_MS)
          else await move(() => map.easeTo({ bearing: bearing + 35, zoom: zoom + 0.5, duration: ORBIT_MS, easing: (t) => t, essential: false }))
          if (stopped) return
        }
        popup?.remove()
        setSelected(null)
        if (to !== undefined && to > time) runClock(time, to, OVERVIEW_MS) // on to the end, then from the start again
        await showOverview()
        await sleep(OVERVIEW_PAUSE_MS * 2)
        // the next rounds: from the timeline's start
        start = restart ?? from
        scenes = laterScenes
      }
    }

    // director mode: the camera is the director's, so the map can't be dragged or zoomed meanwhile
    const handlers = [map.dragPan, map.scrollZoom, map.boxZoom, map.dragRotate, map.keyboard, map.doubleClickZoom, map.touchZoomRotate]
    const wasOn = handlers.map((h) => h.isEnabled())
    if (instant) handlers.forEach((h) => h.disable())

    // straight to the first date and place, without waiting for anything
    onTimeRef.current(from)
    if (overview) map.fitBounds(overview, { padding, duration: 0 })

    // the first picture first, then the film; 3D terrain can take long to settle, so not for too long
    let started = false
    const begin = () => {
      if (started || stopped) return
      started = true
      void play()
    }
    if (instant) begin()
    else map.once('idle', begin)
    const startTimer = setTimeout(begin, MAX_START_WAIT_MS)
    map.triggerRepaint()

    return () => {
      stopped = true
      clearTimeout(startTimer)
      map.off('idle', begin)
      clearInterval(clockTimer)
      popup?.remove()
      if (instant) handlers.forEach((h, i) => wasOn[i] && h.enable())
    }
    // runs once the data is in; later reloads don't restart the film
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, loaded])

  return null
}

export default DemoDirector
