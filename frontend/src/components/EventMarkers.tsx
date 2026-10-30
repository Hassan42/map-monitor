import { useEffect, useRef, useState } from 'react'
import type { GeoJSONSource, MapLayerMouseEvent } from 'maplibre-gl'
import { Popup } from 'maplibre-gl'
import { useContextMenu, useMap, useSelection } from '../store/MapContext'
import type { EventCategory, EventMarker as EventMarkerType, Faction } from '../types/types'
import {
  EVENTS_LAYER_ID,
  EVENTS_SELECTED_LAYER_ID,
  EVENTS_SOURCE_ID,
  RELATIONS_END_LAYER_ID,
  RELATIONS_SELECTED_LAYER_ID,
  RELATIONS_SOURCE_ID,
  eventImageId,
} from '../map/mapLayers'
import { addEventLayers, removeEventLayers } from '../map/eventLayers'
import { EVENT_CATEGORIES, EVENT_CATEGORY_LIST, categoryOf } from '../map/eventCategories'
import { createEventPopupContent } from '../map/EventPopup'
import { EVENT_RELATION_LABELS } from '../map/eventRelations'
import { eventOpacity, parseServerTime } from '../map/eventTime'
import ConfirmDialog from './ConfirmDialog'
import type { MapMouseEvent } from 'maplibre-gl'


const DEFAULT_COLOR = '#737373'
const OUTLINE_COLOR = '#111111'
// sizes in image pixels; images are shown at half that (pixelRatio 2) so they stay sharp
const MARKER_PX = 98
const ICON_PX = 62
const OUTLINE_PX = 4

// loaded category icons; categories without an icon (OTHER) are simply absent
type CategoryIcons = Partial<Record<EventCategory, HTMLImageElement>>

// only events visible at `now` become features: expired ones never reach the map (nor its clusters),
// they stay in the app's event list and come back when `now` moves back in time. allTime: every event,
// fully visible, whatever its date
function eventsToGeoJSON(events: EventMarkerType[], factions: Faction[], now: number, allTime: boolean): GeoJSON.FeatureCollection {
  const colorByFaction = new Map(factions.map((f) => [f.id, f.color]))
  return {
    type: 'FeatureCollection',
    features: events.flatMap((e): GeoJSON.Feature[] => {
      const opacity = allTime ? 1 : eventOpacity(e, now)
      if (opacity === null) return []
      return [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [e.longitude, e.latitude] },
        // the marker layer picks its image from category + color (see eventImageId), and fades it by opacity
        properties: { id: e.id, color: colorByFaction.get(e.factionId) ?? DEFAULT_COLOR, category: categoryOf(e), opacity },
      }]
    }),
  }
}

// the Relations toggle: every relation whose two events have both happened by `now` (the timeline's
// date) - nothing that's still in the future. One line per relation, running from the related-to event to
// the one holding the relation (a cause toward its effect). Of the events involved, the ones the timeline
// no longer shows (they've ended) get a faint marker (a Point with their id, category and color).
// allTime: every relation, and no faint markers (every event has its normal one)
function relationsToGeoJSON(events: EventMarkerType[], factions: Faction[], now: number, allTime: boolean): GeoJSON.FeatureCollection {
  const happened = new Map(events.filter((e) => allTime || parseServerTime(e.timestamp) <= now).map((e) => [e.id, e]))
  const colorByFaction = new Map(factions.map((f) => [f.id, f.color]))
  const at = (e: EventMarkerType): [number, number] => [e.longitude, e.latitude]

  const features: GeoJSON.Feature[] = []
  const involved = new Set<number>()
  for (const e of happened.values()) {
    for (const r of e.relations ?? []) {
      const other = happened.get(r.relatedEventId)
      if (!other) continue // the related event is still in the future (or deleted)
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [at(other), at(e)] },
        properties: { type: r.type, label: EVENT_RELATION_LABELS[r.type] }, // label: shown on the line
      })
      involved.add(e.id).add(other.id)
    }
  }

  for (const id of involved) {
    const e = happened.get(id)!
    if (allTime || eventOpacity(e, now) !== null) continue // still shown at this date: it has its normal marker
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: at(e) },
      properties: { id: e.id, category: categoryOf(e), color: colorByFaction.get(e.factionId) ?? DEFAULT_COLOR },
    })
  }
  return { type: 'FeatureCollection', features }
}

async function loadImage(url: string) {
  const img = new Image()
  img.src = url
  await img.decode()
  return img
}

// every category's icon, loaded once
async function loadCategoryIcons(): Promise<CategoryIcons> {
  const loaded = await Promise.all(
    EVENT_CATEGORY_LIST.map(async (category) => {
      const url = EVENT_CATEGORIES[category].icon
      return [category, url ? await loadImage(url) : null] as const
    }),
  )
  return Object.fromEntries(loaded.filter(([, img]) => img)) as CategoryIcons
}

// one marker as a single image: circle in the faction color, dark outline, white category icon.
// drawing it as one image (instead of a circle layer + an icon layer) means an event on top
// covers the whole event below it, icon included
function drawMarkerImage(icon: HTMLImageElement | undefined, color: string) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = MARKER_PX
  const ctx = canvas.getContext('2d')!

  ctx.beginPath()
  ctx.arc(MARKER_PX / 2, MARKER_PX / 2, MARKER_PX / 2 - OUTLINE_PX / 2, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.lineWidth = OUTLINE_PX
  ctx.strokeStyle = OUTLINE_COLOR
  ctx.stroke()

  if (icon) {
    // fit inside an ICON_PX square keeping the icon's proportions (e.g. the flag is taller than wide)
    const scale = Math.min(ICON_PX / icon.naturalWidth, ICON_PX / icon.naturalHeight)
    const w = icon.naturalWidth * scale
    const h = icon.naturalHeight * scale

    // the icons are single-color (black): recolor white on their own canvas, then stamp in the middle
    const iconCanvas = document.createElement('canvas')
    iconCanvas.width = iconCanvas.height = ICON_PX
    const iconCtx = iconCanvas.getContext('2d')!
    iconCtx.drawImage(icon, (ICON_PX - w) / 2, (ICON_PX - h) / 2, w, h)
    iconCtx.globalCompositeOperation = 'source-in' // keep the icon's shape, replace its color
    iconCtx.fillStyle = '#fff'
    iconCtx.fillRect(0, 0, ICON_PX, ICON_PX)
    ctx.drawImage(iconCanvas, (MARKER_PX - ICON_PX) / 2, (MARKER_PX - ICON_PX) / 2)
  }

  return ctx.getImageData(0, 0, MARKER_PX, MARKER_PX)
}

// events drawn by the map itself (GeoJSON source + layers) instead of one HTML Marker each:
// a circle in the faction color with the category's icon on top, clustered when zoomed out
function EventMarkers({
  events,
  factions,
  onMoved,
  onEdit,
  onDelete,
  now,
  editMode,
  showRelations,
  allTime,
}: {
  events: EventMarkerType[]
  factions: Faction[]
  onMoved: (id: number, latitude: number, longitude: number) => Promise<void>
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  now: number // the map's date (ms): decides which events show and how faded
  editMode: boolean // the right-click menu (move/edit/delete) is for editing only
  showRelations: boolean // the nav bar's Relations toggle
  allTime: boolean // the nav bar's All time toggle: every event, whatever `now` is
}) {
  const map = useMap()
  const [selected, setSelected] = useSelection()
  // the icons every marker image is drawn from; markers wait until they've loaded
  const [icons, setIcons] = useState<CategoryIcons | null>(null)
  // right-click menu on an event (from the map or the property panel)
  const [contextMenu, setContextMenu] = useContextMenu()
  const menu = contextMenu?.type === 'event' ? contextMenu : null
  // the event waiting for "really delete?" (ConfirmDialog)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [movingId, setMovingId] = useState<number | null>(null)
  // same value for the map's click handlers, which keep the state from when they were registered
  const movingRef = useRef<number | null>(null)
  useEffect(() => {
    movingRef.current = movingId
  }, [movingId])

  useEffect(() => {
    let cancelled = false
    loadCategoryIcons().then((loaded) => {
      if (!cancelled) setIcons(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // source + layers (defined in eventLayers.ts), once per map
  useEffect(() => {
    if (!map) return
    addEventLayers(map)
    return () => removeEventLayers(map)
  }, [map])

  // data: one setData call replaces every point. Each (category, color) marker image in use is
  // created here, before the data needs it - MapLibre's on-demand 'styleimagemissing' route only
  // reliably fills one missing image per first draw, so some events would stay invisible
  useEffect(() => {
    if (!map || !icons) return
    const source = map.getSource(EVENTS_SOURCE_ID) as GeoJSONSource | undefined
    if (!source) return

    const data = eventsToGeoJSON(events, factions, now, allTime)
    for (const feature of data.features) {
      const { category, color } = feature.properties as { category: EventCategory; color: string }
      const imageId = eventImageId(category, color)
      if (!map.hasImage(imageId)) map.addImage(imageId, drawMarkerImage(icons[category], color), { pixelRatio: 2 })
    }
    source.setData(data)
  }, [map, icons, events, factions, now, allTime])

  // selected event: show the accent ring under it
  useEffect(() => {
    if (!map?.getLayer(EVENTS_SELECTED_LAYER_ID)) return
    const selectedId = selected?.type === 'event' ? selected.id : -1
    map.setFilter(EVENTS_SELECTED_LAYER_ID, ['==', ['get', 'id'], selectedId])
    // the same event may be a faint marker of the Relations toggle instead
    if (map.getLayer(RELATIONS_SELECTED_LAYER_ID)) {
      map.setFilter(RELATIONS_SELECTED_LAYER_ID, ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'id'], selectedId]])
    }
  }, [map, selected])


  useEffect(() => {

    if (!map) return

    const handlePopUp = (e: MapLayerMouseEvent) => {
      if (movingRef.current !== null) return // the click that drops a moved event opens no popup

      const feature = e.features?.[0]

      if (!feature || feature.geometry.type !== 'Point') return

      const coordinates = feature.geometry.coordinates as [number, number]

      const event = events.find((ev) => ev.id === feature.properties.id)
      if (!event) {
        return
      }

      new Popup({ className: 'event-popup', offset: 18 })
        .setLngLat(coordinates)
        .setDOMContent(createEventPopupContent(event))
        // .setText(feature.properties.description)
        .addTo(map)

    }

    map.on('click', EVENTS_LAYER_ID, handlePopUp)
    map.on('click', RELATIONS_END_LAYER_ID, handlePopUp) // the Relations toggle's faint markers too
    // remove it before the next run (events change often): otherwise every run adds one more
    // handler and a single click opens a popup per handler, stacked on top of each other
    return () => {
      map.off('click', EVENTS_LAYER_ID, handlePopUp)
      map.off('click', RELATIONS_END_LAYER_ID, handlePopUp)
    }
  }, [map, events])

  // double-click an event: zoom in on it (like double-clicking its row in the property panel)
  useEffect(() => {
    if (!map) return

    const handleDoubleClick = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0]
      if (!feature || feature.geometry.type !== 'Point') return

      e.preventDefault() // stop MapLibre's own double-click zoom toward the cursor
      const center = feature.geometry.coordinates as [number, number]
      // start on the next tick: MapLibre stops camera animations while it's still handling the
      // double-click input, so an easeTo started right here gets cancelled immediately
      setTimeout(() => {
        map.easeTo({ center, zoom: 12 })
      })
    }

    const handleRightClick = (e: MapLayerMouseEvent) => {
      e.preventDefault() // no browser right-click menu
      const feature = e.features?.[0]
      if (!feature) return
      setContextMenu({
        type: 'event',
        id: feature.properties.id as number,
        x: e.originalEvent.clientX,
        y: e.originalEvent.clientY,
        lngLat: e.lngLat,
      });
      setSelected({ type: 'event', id: feature.properties.id as number });

    }


    // map.off only removes the same function that was passed to map.on, so keep it in a const
    const closeMenu = () => setContextMenu(null)

    map.on('contextmenu', EVENTS_LAYER_ID, handleRightClick)
    map.on('click', closeMenu)
    map.on('dblclick', EVENTS_LAYER_ID, handleDoubleClick)
    return () => {
      map.off('dblclick', EVENTS_LAYER_ID, handleDoubleClick)
      map.off('click', closeMenu)
      map.off('contextmenu', EVENTS_LAYER_ID, handleRightClick)
    }
  }, [map, setContextMenu])

  // movement of evetn on map
  useEffect(() => {
    if (!map || movingId === null) return
    const source = map.getSource(EVENTS_SOURCE_ID) as GeoJSONSource
    const data = eventsToGeoJSON(events, factions, now, allTime)
    const feature = data.features.find((f) => f.properties?.id === movingId)
    if (!feature) return
    const point = feature.geometry as GeoJSON.Point

    map.getCanvas().style.cursor = 'grabbing'

    const handleMove = (e: MapMouseEvent) => {
      point.coordinates = [e.lngLat.lng, e.lngLat.lat]
      source.setData(data) // redraw with the marker at the mouse
    }
    const handleRelease = (e: MapMouseEvent) => {
      onMoved(movingId, e.lngLat.lat, e.lngLat.lng) // parent saves it
      setMovingId(null)
    }

    map.on('mousemove', handleMove)
    map.once('click', handleRelease)
    return () => {
      map.getCanvas().style.cursor = ''
      map.off('mousemove', handleMove)
      map.off('click', handleRelease)
    }
  }, [map, movingId, events, factions, now, allTime, onMoved])


  // the Relations toggle: draw (or clear) the lines; they follow the timeline and event changes
  useEffect(() => {
    if (!map || !icons) return
    const source = map.getSource(RELATIONS_SOURCE_ID) as GeoJSONSource | undefined
    if (!source) return
    const data: GeoJSON.FeatureCollection = showRelations
      ? relationsToGeoJSON(events, factions, now, allTime)
      : { type: 'FeatureCollection', features: [] }
    // the faint markers use the same images as the normal ones; ended events may not have theirs yet
    for (const feature of data.features) {
      if (feature.geometry.type !== 'Point') continue
      const { category, color } = feature.properties as { category: EventCategory; color: string }
      const imageId = eventImageId(category, color)
      if (!map.hasImage(imageId)) map.addImage(imageId, drawMarkerImage(icons[category], color), { pixelRatio: 2 })
    }
    source.setData(data)
  }, [map, icons, showRelations, events, factions, now, allTime])

  return (
    <>
      {menu != null && editMode && movingId === null && // everything in it is for editing
        (< div
          className="fixed z-50 min-w-40 bg-neutral-900 py-1 text-sm text-gray-300 shadow-xl ring-1 ring-white/10"
          style={{ left: menu.x, top: menu.y }}
        >
          {/* changing the map: edit mode only */}
          {editMode && (<>
          <button
            type="button"
            onClick={() => {
              document.querySelectorAll('.event-popup').forEach((p) => p.remove()) // close open popups
              setMovingId(menu.id)
            }}
            className="block w-full px-3 py-1.5 text-left hover:bg-accent-400/15 hover:text-accent-300"
          >
            Move
          </button>

          <button
            type="button"
            onClick={() => {
              onEdit(menu.id)
              setContextMenu(null)
            }}
            className="block w-full px-3 py-1.5 text-left hover:bg-accent-400/15 hover:text-accent-300"
          >
            Edit event
          </button>

{/* 
          <button
            type="button"
            onClick={() => { console.log('edit') }}
            className="block w-full px-3 py-1.5 text-left hover:bg-accent-400/15 hover:text-accent-300"
          >
            Relates to
          </button> */}

          <button
            type="button"
            onClick={() => {
              setContextMenu(null)
              setDeletingId(menu.id)
            }}
            className="block w-full px-3 py-1.5 text-left hover:bg-red-500/15 hover:text-red-400"
          >
            Delete
          </button>
          </>)}
        </div >)}

      {deletingId !== null && (
        <ConfirmDialog
          title={`Delete this event?`}
          message="The entire event will be removed from the map's history: it disappears on every date of the timeline, not just from now on."
          onConfirm={() => {
            document.querySelectorAll('.event-popup').forEach((p) => p.remove()) // its popup may be open
            onDelete(deletingId)
            setDeletingId(null)
          }}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </>
  )
}

export default EventMarkers
