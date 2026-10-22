import { useEffect, useState } from 'react'
import type { GeoJSONSource, MapLayerMouseEvent } from 'maplibre-gl'
import { Popup } from 'maplibre-gl'
import { useMap, useSelection } from '../store/MapContext'
import type { EventCategory, EventMarker as EventMarkerType, Faction } from '../types/types'
import { EVENTS_LAYER_ID, EVENTS_SELECTED_LAYER_ID, EVENTS_SOURCE_ID, eventImageId } from '../map/mapLayers'
import { addEventLayers, removeEventLayers } from '../map/eventLayers'
import { EVENT_CATEGORIES, EVENT_CATEGORY_LIST, categoryOf } from '../map/eventCategories'
import { createEventPopupContent } from '../map/EventPopup'

const DEFAULT_COLOR = '#737373'
const OUTLINE_COLOR = '#111111'
// sizes in image pixels; images are shown at half that (pixelRatio 2) so they stay sharp
const MARKER_PX = 98
const ICON_PX = 62
const OUTLINE_PX = 4

// loaded category icons; categories without an icon (OTHER) are simply absent
type CategoryIcons = Partial<Record<EventCategory, HTMLImageElement>>

function eventsToGeoJSON(events: EventMarkerType[], factions: Faction[]): GeoJSON.FeatureCollection {
  const colorByFaction = new Map(factions.map((f) => [f.id, f.color]))
  return {
    type: 'FeatureCollection',
    features: events.map((e) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [e.longitude, e.latitude] },
      // the marker layer picks its image from category + color (see eventImageId)
      properties: { id: e.id, color: colorByFaction.get(e.factionId) ?? DEFAULT_COLOR, category: categoryOf(e), description: "test" },
    })),
  }
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
}: {
  events: EventMarkerType[]
  factions: Faction[]
}) {
  const map = useMap()
  const [selected, setSelected] = useSelection()
  // the icons every marker image is drawn from; markers wait until they've loaded
  const [icons, setIcons] = useState<CategoryIcons | null>(null)
  const [menu, setMenu] = useState<{ x: number, y: number, eventId: number } | null>(null)

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

    const data = eventsToGeoJSON(events, factions)
    for (const feature of data.features) {
      const { category, color } = feature.properties as { category: EventCategory; color: string }
      const imageId = eventImageId(category, color)
      if (!map.hasImage(imageId)) map.addImage(imageId, drawMarkerImage(icons[category], color), { pixelRatio: 2 })
    }
    source.setData(data)
  }, [map, icons, events, factions])

  // selected event: show the accent ring under it
  useEffect(() => {
    if (!map?.getLayer(EVENTS_SELECTED_LAYER_ID)) return
    const selectedId = selected?.type === 'event' ? selected.id : -1
    map.setFilter(EVENTS_SELECTED_LAYER_ID, ['==', ['get', 'id'], selectedId])
  }, [map, selected])


  useEffect(() => {

    if (!map) return

    const handlePopUp = (e: MapLayerMouseEvent) => {

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
      setMenu({
        x: e.originalEvent.clientX,
        y: e.originalEvent.clientY,
        eventId: feature.properties.id as number
      });
      setSelected({ type: 'event',  id: feature.properties.id as number });

    }


    map.on('contextmenu', EVENTS_LAYER_ID, handleRightClick)
    map.on('click', () => { setMenu(null) })
    map.on('dblclick', EVENTS_LAYER_ID, handleDoubleClick)
    return () => {
      map.off('dblclick', EVENTS_LAYER_ID, handleDoubleClick)
      map.off('click', () => { setMenu(null) })
      map.off('contextmenu', EVENTS_LAYER_ID, handleRightClick)
    }
  }, [map])

  return (
    <>
      {menu != null &&
        (< div
          className="fixed z-50 min-w-40 bg-neutral-900 py-1 text-sm text-gray-300 shadow-xl ring-1 ring-white/10"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            type="button"
            onClick={() => { console.log('edit') }}
            className="block w-full px-3 py-1.5 text-left hover:bg-accent-400/15 hover:text-accent-300"
          >
            Move
          </button>

          <button
            type="button"
            onClick={() => { console.log('edit') }}
            className="block w-full px-3 py-1.5 text-left hover:bg-accent-400/15 hover:text-accent-300"
          >
            Edit event
          </button>

          <button
            type="button"
            onClick={() => { console.log('edit') }}
            className="block w-full px-3 py-1.5 text-left hover:bg-accent-400/15 hover:text-accent-300"
          >
            Delete
          </button>

                    <button
            type="button"
            onClick={() => { console.log('edit') }}
            className="block w-full px-3 py-1.5 text-left hover:bg-accent-400/15 hover:text-accent-300"
          >
            Relates to 
          </button>

        </div >)}
    </>
  )
}

export default EventMarkers
