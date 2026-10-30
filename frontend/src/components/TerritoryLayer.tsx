import { useEffect, useRef, useState } from 'react'
import { MaplibreTerradrawControl } from '@watergis/maplibre-gl-terradraw'
import '@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.css'
import { TerraDrawPolygonMode, TerraDrawSelectMode, TerraDrawFreehandMode } from 'terra-draw'
import type { TerraDrawMouseEvent } from 'terra-draw'
import { LngLatBounds, MercatorCoordinate } from 'maplibre-gl'
import type { LngLat, MapMouseEvent } from 'maplibre-gl'
import type { TerraDraw, GeoJSONStoreFeatures, HexColor } from 'terra-draw'
import { useContextMenu, useMap, useSelection } from '../store/MapContext'
import { createTerritory, deleteTerritory, editTerritory } from '../api/territory'
import { toLocalInput } from './eventFormValues'
import { carryEditForward, withShapeAt } from '../map/territoryTime'
import { parseServerTime } from '../map/eventTime'
import ConfirmDialog from './ConfirmDialog'
import type { DrawMode, Faction, Layer, Territory } from '../types/types'
import TerritoryForm from './TerritoryForm'
import type { TerritoryFormValues } from './TerritoryForm'
import { EVENTS_CLUSTER_LAYER_ID, EVENTS_LAYER_ID } from '../map/mapLayers'
import { findAnnotationAt } from '../map/annotationHitTest'

// saved territories carry their color in properties; new unsaved drawings fall back to blue
const territoryColor = (f: GeoJSONStoreFeatures) => (f.properties.color as HexColor | undefined) ?? '#3f97e0'

// view-mode selection (set by the highlight effect); styled like terra-draw's edit-mode selection
const isHighlighted = (f: GeoJSONStoreFeatures) => f.properties.highlighted === true


// select-mode finish actions that change a polygon's shape
const EDIT_ACTIONS = ['edit', 'deleteCoordinate', 'insertMidpoint', 'dragCoordinate', 'dragFeature', 'dragCoordinateResize']

// polygon rings with 7 decimals (about 1 cm): freehand smoothing produces more decimals than terra-draw's
// polygon mode accepts (9), and it silently refuses such shapes when they're loaded back
const roundCoordinate = (v: number) => Math.round(v * 1e7) / 1e7
const roundRings = (rings: number[][][]) => rings.map((ring) => ring.map(([x, y]) => [roundCoordinate(x), roundCoordinate(y)]))

// the box around a territory's current shape
function boundsOf(t: Territory): LngLatBounds {
  const bounds = new LngLatBounds()
  for (const ring of JSON.parse(t.points) as [number, number][][]) for (const point of ring) bounds.extend(point)
  return bounds
}

// rings shifted by how far the pointer went from `from` to `to`, in Web Mercator so the shape keeps the
// size and look it has on screen (a plain lng/lat shift would stretch it moving north or south)
function translateRings(rings: number[][][], from: LngLat, to: LngLat): number[][][] {
  const a = MercatorCoordinate.fromLngLat(from)
  const b = MercatorCoordinate.fromLngLat(to)
  return roundRings(rings.map((ring) => ring.map(([lng, lat]) => {
    const p = MercatorCoordinate.fromLngLat([lng, lat])
    const moved = new MercatorCoordinate(p.x + b.x - a.x, p.y + b.y - a.y).toLngLat()
    return [moved.lng, moved.lat]
  })))
}

// the edit form's starting values: faction and color of the latest shape, creation = the first shape's date
// (empty for "always", a 1970 `from`), end = the territory's end or now
function territoryToFormValues(t: Territory): TerritoryFormValues {
  const history = t.history ?? []
  const latest = history[history.length - 1] ?? t
  const created = history.length > 0 ? parseServerTime(history[0].from) : 0
  return {
    factionId: latest.factionId,
    layerId: t.layerId ?? null,
    color: latest.color,
    createdAt: created > 0 ? toLocalInput(created) : '',
    ongoing: !t.endTime,
    endTime: toLocalInput(t.endTime ? parseServerTime(t.endTime) : Date.now()),
  }
}

// the creation can't be in the future, nor at or after the territory's second shape
function latestCreation(t: Territory): { time: number; message: string } {
  const second = t.history?.[1]
  if (second && parseServerTime(second.from) <= Date.now()) {
    return { time: parseServerTime(second.from) - 60_000, message: "Creation must be before the territory's next shape" }
  }
  return { time: Date.now(), message: "Creation can't be in the future" }
}

function TerritoryLayer({
  mapId,
  factions,
  layers,
  territories,
  active,
  mode,
  onModeChange,
  onCreated,
  onUpdated,
  onDeleted,
  onError,
  now,
}: {
  mapId: string
  factions: Faction[]
  layers: Layer[]
  territories: Territory[]
  active: boolean
  mode: DrawMode | null
  onModeChange: (mode: DrawMode | null) => void
  onCreated: (territory: Territory) => void
  onUpdated: (territory: Territory) => void
  onDeleted: (territoryId: number) => void
  onError: (message: string) => void
  now: number // the timeline's date: a reshaped polygon is saved as its shape from this date on
}) {
  const map = useMap()
  const [selected, setSelected] = useSelection()
  const [pendingPoints, setPendingPoints] = useState<string | null>(null)
  const [pendingFeatureId, setPendingFeatureId] = useState<string | number | null>(null)
  // when the pending shape was drawn (ms): the new territory's default creation and end, and the latest allowed
  const [drawnAt, setDrawnAt] = useState(0)
  // the territory whose edit form is open (from its right-click menu)
  const [editingId, setEditingId] = useState<number | null>(null)
  const terraDrawRef = useRef<TerraDraw | null>(null)
  // latest territories for the terra-draw handlers, which are only created once
  const territoriesRef = useRef(territories)
  // the timeline's date for the terra-draw handlers, which are only created once
  const nowRef = useRef(now)
  // right-click menu on a territory (from the map or the property panel), and the territory waiting for "really delete?"
  const [contextMenu, setContextMenu] = useContextMenu()
  const menu = contextMenu?.type === 'territory' ? contextMenu : null
  // right-click > Move: the territory follows the pointer from where it was right-clicked (`anchor`)
  const [moving, setMoving] = useState<{ territoryId: number; anchor: LngLat } | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  // saves a reshaped polygon as its shape from the timeline's date on (withShapeAt), and carries the
  // edit into later shapes wherever they still have the changed stretches (carryEditForward) - their
  // own changes stay. `territory` is the version shown at that date; it carries the full history
  const saveShape = (territory: Territory, points: string) => {
    const at = Math.min(nowRef.current, Date.now()) // never in the future: Live would show an older shape until then
    const shaped = withShapeAt(territory, { points, factionId: territory.factionId, color: territory.color }, at)
    const updated = carryEditForward(shaped, territory.points, points, at)
    // PUT replaces every field, so send the whole territory
    const { id: stableId, ...data } = updated
    editTerritory(mapId, stableId, { ...data, endTime: data.endTime ?? null })
      .then(onUpdated)
      .catch(() => onError('Could not save territory'))
  }
  // for the terra-draw handlers, which are only created once
  const saveShapeRef = useRef(saveShape)
  useEffect(() => {
    saveShapeRef.current = saveShape
  })
  // terra-draw feature id -> territory stableId; needed because a deleted feature can't be looked up anymore
  const featureToTerritoryRef = useRef(new Map<string | number, number>())
  // true while the reload effect clears and re-adds features: the deselect that clear() fires there
  // isn't the user's, so it must not drop the selection
  const reloadingRef = useRef(false)
  // latest selection for the reload effect, which shouldn't rerun on every selection change
  const selectedRef = useRef(selected)
  useEffect(() => {
    selectedRef.current = selected
  }, [selected])


  useEffect(() => {
    nowRef.current = now
  }, [now])

  useEffect(() => {
    territoriesRef.current = territories
  }, [territories])

  // create terra-draw once per map; it stays alive in both view and edit mode
  useEffect(() => {
    if (!map) return

    const isOverEvent = (e: TerraDrawMouseEvent) => {
      const layers = [EVENTS_LAYER_ID, EVENTS_CLUSTER_LAYER_ID].filter((id) => map.getLayer(id))
      const eventSelected =
        (layers.length > 0 && map.queryRenderedFeatures([e.containerX, e.containerY], { layers }).length > 0) ||
        findAnnotationAt(map, [e.containerX, e.containerY]) != null
      const selectedFeature = terraDraw
        ?.getSnapshot()
        .find((f) => f.properties.selected === true && f.geometry.type === 'Polygon')
      const selectedFeatureID = selectedFeature?.id
      if (selectedFeatureID != null && eventSelected) terraDraw?.deselectFeature(selectedFeatureID)
      return eventSelected
    }

    const draw = new MaplibreTerradrawControl({
      modes: [
        'polygon',
        'freehand',
        'select',
        'delete-selection',
      ],
      open: true,
      // deleting now removes the territory on the backend, so ask first
      showDeleteConfirmation: true,
      modeOptions: {
        freehand: new TerraDrawFreehandMode({
          minDistance: 5,
          smoothing: 0.4,
          styles: { /* same territory styling as polygon, so it matches */ },
        }),

        polygon: new TerraDrawPolygonMode({
          styles: {
            fillColor: territoryColor,
            fillOpacity: (f) => (isHighlighted(f) ? 0.6 : 0.4),
            outlineColor: (f) => (isHighlighted(f) ? '#ffffff' : territoryColor(f)),
            outlineWidth: 1,
          },
        }),
        select: new TerraDrawSelectMode({
          // the control fills in its default flags (drag/edit rules) for any mode not listed. Territories
          // (polygon; freehand before they're saved) keep those defaults, except dragging the whole
          // shape: that's right-click > Move, so a stray drag can't shift a territory
          flags: {
            polygon: {
              feature: {
                draggable: false,
                rotateable: true,
                scaleable: true,
                coordinates: { midpoints: true, draggable: true, deletable: true },
              },
            },
            freehand: {
              feature: {
                draggable: false,
                coordinates: { midpoints: true, draggable: true, deletable: true },
              },
            },
          },
          styles: {
            selectedPolygonColor: territoryColor,
            selectedPolygonFillOpacity: 0.6,
            selectedPolygonOutlineColor: '#ffffff',
            selectedPolygonOutlineWidth: 1,
          },
          pointerEvents: {
            leftClick: (e) => !isOverEvent(e),
            onDragStart: (e) => !isOverEvent(e),
            rightClick: true,
            contextMenu: false,
            onDrag: true,
            onDragEnd: true,
          }
        }),
      },
    })

    map.addControl(draw, 'bottom-left')

    const terraDraw = draw.getTerraDrawInstance()
    if (!terraDraw) {
      map.removeControl(draw)
      return
    }
    terraDrawRef.current = terraDraw

    // polygons reshaped since they were selected; saved once on deselect instead of on every drag
    const editedFeatureIds = new Set<string | number>()

    // terra-draw only holds territories; map its feature UUID back to the territory's real id
    const handleSelect = (id: string | number) => {


      const feature = terraDraw.getSnapshot().find((f) => f.id === id)
      const territoryId = feature?.properties.territoryId as number | undefined
      // a just-drawn, unsaved shape has no territoryId yet
      setSelected(territoryId != null ? { type: 'territory', id: territoryId } : null)
    }
    const handleDeselect = (id: string | number) => {
      // only clear a territory selection; clicking an event also deselects the polygon in terra-draw
      if (!reloadingRef.current) setSelected((prev) => (prev?.type === 'territory' ? null : prev))
      if (!editedFeatureIds.delete(id)) return

      // gone from the snapshot means it was deleted, which handleFeatureDeleted takes care of
      const feature = terraDraw.getSnapshot().find((f) => f.id === id)
      const territoryId = feature?.properties.territoryId as number | undefined
      const territory = territoriesRef.current.find((t) => t.id === territoryId)
      if (!feature || !territory) return

      // the new shape holds from the timeline's date on, and the edit goes into later shapes too
      saveShapeRef.current(territory, JSON.stringify(roundRings(feature.geometry.coordinates as number[][][])))
    }
    const handleFinish = (id: string | number, context: { action: string }) => {
      if (context.action === 'draw') {
        const feature = terraDraw.getSnapshot().find((f) => f.id === id)
        if (!feature) return
        setPendingPoints(JSON.stringify(roundRings(feature.geometry.coordinates as number[][][])))
        setPendingFeatureId(id)
        setDrawnAt(Date.now())
        onModeChange(null)
        return
      }

      // reshaped an existing territory: just remember it, handleDeselect saves it
      if (EDIT_ACTIONS.includes(context.action)) editedFeatureIds.add(id)
    }

    // fired by the toolbar's delete-selection button, after the features are already gone from terra-draw
    // Ctrl+Z / Ctrl+Shift+Z (terra-draw's own undo/redo) changes shapes without a finish or deselect, so
    // nothing would save them: after each undo/redo, save every territory whose drawn shape now differs
    // from its saved one - like a normal edit, at the timeline's date
    const handleHistory = (event: { cause: string }) => {
      if (event.cause !== 'undo' && event.cause !== 'redo') return
      setTimeout(() => { // once terra-draw has applied it
        for (const feature of terraDraw.getSnapshot()) {
          const territoryId = feature.properties.territoryId as number | undefined
          if (territoryId == null || feature.geometry.type !== 'Polygon') continue
          const territory = territoriesRef.current.find((t) => t.id === territoryId)
          if (!territory) continue
          const drawn = JSON.stringify(roundRings(feature.geometry.coordinates as number[][][]))
          if (drawn === JSON.stringify(roundRings(JSON.parse(territory.points)))) continue
          editedFeatureIds.delete(feature.id!) // saved here; deselecting shouldn't save it again
          saveShapeRef.current(territory, drawn)
        }
      })
    }

    const handleFeatureDeleted = ({ deletedIds }: { deletedIds?: (string | number)[] }) => {
      for (const featureId of deletedIds ?? []) {
        const territoryId = featureToTerritoryRef.current.get(featureId)
        if (territoryId == null) continue
        deleteTerritory(mapId, territoryId)
          .then(() => onDeleted(territoryId))
          .catch(() => onError('Could not delete territory'))
      }
    }

    terraDraw.on('select', handleSelect)
    terraDraw.on('history', handleHistory)
    terraDraw.on('deselect', handleDeselect)
    terraDraw.on('finish', handleFinish)
    draw.on('feature-deleted', handleFeatureDeleted)

    return () => {
      terraDraw.off('select', handleSelect)
      terraDraw.off('history', handleHistory)
      terraDraw.off('deselect', handleDeselect)
      terraDraw.off('finish', handleFinish)
      draw.off('feature-deleted', handleFeatureDeleted)
      terraDrawRef.current = null
      // map.remove() (MapProvider, on leaving the page) may have removed it already
      if (map.hasControl(draw)) map.removeControl(draw)
    }
  }, [map, mapId, setSelected, onModeChange, onUpdated, onDeleted, onError])

  // view mode = display only ('default'); edit mode = whatever the dropdown picked
  useEffect(() => {
    const terraDraw = terraDrawRef.current
    if (!terraDraw) return
    if (!terraDraw.enabled) terraDraw.start()
    terraDraw.setMode(active && mode ? mode : 'default')
  }, [map, active, mode])

  // hide the draw toolbar outside edit mode (see index.css)
  useEffect(() => {
    map?.getContainer().classList.toggle('draw-locked', !active)
  }, [map, active])

  // terra-draw is the only renderer of territories: reload all of them whenever the list changes
  useEffect(() => {
    const terraDraw = terraDrawRef.current
    if (!terraDraw) return

    // already showing exactly these shapes (e.g. right after saving an edit, or an undo): leave terra-draw
    // alone, so its undo history (Ctrl+Z) stays valid across saves
    const shownKey = (id: number, coordinates: unknown, color: unknown) => `${id}|${color}|${JSON.stringify(coordinates)}`
    const wanted = territories.map((t) => shownKey(t.id, roundRings(JSON.parse(t.points)), t.color)).sort()
    const drawn = terraDraw
      .getSnapshot()
      .filter((f) => f.geometry.type === 'Polygon')
      .map((f) => shownKey(f.properties.territoryId as number, roundRings(f.geometry.coordinates as number[][][]), f.properties.color))
      .sort()
    if (wanted.length === drawn.length && wanted.every((key, i) => key === drawn[i])) return

    const features: GeoJSONStoreFeatures[] = territories.map((t) => ({
      type: 'Feature',
      id: terraDraw.getFeatureId(),
      geometry: { type: 'Polygon', coordinates: roundRings(JSON.parse(t.points)) },
      properties: { mode: 'polygon', territoryId: t.id, color: t.color },
    }))
    reloadingRef.current = true
    terraDraw.clear()
    // terra-draw silently skips features that fail its checks: say which ones, and why
    const rejected = terraDraw.addFeatures(features).filter((r) => !r.valid)
    for (const r of rejected) {
      const territoryId = features.find((f) => f.id === r.id)?.properties.territoryId
      console.warn(`Territory ${territoryId} can't be drawn: ${r.reason ?? 'invalid shape'}`)
    }
    reloadingRef.current = false
    featureToTerritoryRef.current = new Map(features.map((f) => [f.id!, f.properties.territoryId as number]))
    // the reload replaced every feature (new ids): older undo steps would point at features that are gone
    terraDraw.clearUndoRedoHistory()

    // the reload dropped terra-draw's own selection (edit mode): select the same territory's new feature
    const current = selectedRef.current
    if (terraDraw.getMode() === 'select' && current?.type === 'territory') {
      const feature = features.find((f) => f.properties.territoryId === current.id)
      if (feature) terraDraw.selectFeature(feature.id!)
    }
  }, [map, territories])

  // highlight the territory picked with the view-mode Select tool. Runs after the reload effect
  // (and on territories changes) because a reload re-adds features without the flag.
  // In edit mode terra-draw's own select styling shows the selection instead.
  useEffect(() => {
    const terraDraw = terraDrawRef.current
    if (!terraDraw) return

    const highlightedId = !active && selected?.type === 'territory' ? selected.id : null
    for (const f of terraDraw.getSnapshot()) {
      if (f.properties.territoryId == null) continue
      const highlight = f.properties.territoryId === highlightedId
      if (isHighlighted(f) !== highlight) terraDraw.updateFeatureProperties(f.id!, { highlighted: highlight })
    }
  }, [map, active, selected, territories])

  // right-click a territory in edit mode: open its menu. Events and annotations on top have their own
  useEffect(() => {
    if (!map || !active) return
    const handleRightClick = (e: MapMouseEvent) => {
      const terraDraw = terraDrawRef.current
      if (!terraDraw) return
      const point: [number, number] = [e.point.x, e.point.y]
      const eventLayers = [EVENTS_LAYER_ID, EVENTS_CLUSTER_LAYER_ID].filter((id) => map.getLayer(id))
      if (eventLayers.length > 0 && map.queryRenderedFeatures(point, { layers: eventLayers }).length > 0) return
      if (findAnnotationAt(map, point) != null) return

      const feature = terraDraw
        .getFeaturesAtLngLat(e.lngLat, { ignoreCoordinatePoints: true, ignoreSelectFeatures: true })
        .find((f) => f.geometry.type === 'Polygon' && f.properties.territoryId != null)
      if (!feature) return
      e.preventDefault()
      setContextMenu({ type: 'territory', id: feature.properties.territoryId as number, x: e.originalEvent.clientX, y: e.originalEvent.clientY, lngLat: e.lngLat })
    }
    map.on('contextmenu', handleRightClick)
    return () => {
      map.off('contextmenu', handleRightClick)
    }
  }, [map, active, setContextMenu])

  // the menu closes on a click elsewhere, when the map moves, on Escape, or when leaving edit mode
  useEffect(() => {
    if (!map || !menu) return
    const close = () => setContextMenu(null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    map.on('click', close)
    map.on('movestart', close)
    window.addEventListener('keydown', onKey)
    return () => {
      map.off('click', close)
      map.off('movestart', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [map, menu, setContextMenu])

  // moving: the shape follows the pointer, a click puts it down and saves it (like a reshape, from the
  // timeline's date on), Escape puts it back. No need to select it first
  useEffect(() => {
    const terraDraw = terraDrawRef.current
    if (!map || !moving || !terraDraw) return
    const feature = terraDraw.getSnapshot().find((f) => f.properties.territoryId === moving.territoryId && f.geometry.type === 'Polygon')
    const territory = territoriesRef.current.find((t) => t.id === moving.territoryId)
    if (!feature || !territory) {
      setMoving(null)
      return
    }
    // a selected shape has its edit handles drawn as separate features, which wouldn't move along
    for (const f of terraDraw.getSnapshot()) if (f.properties.selected === true) terraDraw.deselectFeature(f.id!)
    const featureId = feature.id!
    const original = feature.geometry.coordinates as number[][][]
    let rings = original
    let placed = false
    const container = map.getContainer()
    container.classList.add('map-moving')

    const handleMove = (e: MapMouseEvent) => {
      rings = translateRings(original, moving.anchor, e.lngLat)
      terraDraw.updateFeatureGeometry(featureId, { type: 'Polygon', coordinates: rings })
    }
    const handleClick = (e: MapMouseEvent) => {
      handleMove(e) // the click's own spot is the final one
      placed = true
      setMoving(null)
      const points = JSON.stringify(rings)
      if (points !== JSON.stringify(roundRings(original))) saveShapeRef.current(territory, points) // a click without moving saves nothing
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoving(null)
    }
    map.on('mousemove', handleMove)
    map.on('click', handleClick)
    window.addEventListener('keydown', onKey)
    return () => {
      map.off('mousemove', handleMove)
      map.off('click', handleClick)
      window.removeEventListener('keydown', onKey)
      container.classList.remove('map-moving')
      // Escape or leaving edit mode: put it back where it was
      if (!placed && terraDraw.getSnapshot().some((f) => f.id === featureId)) {
        terraDraw.updateFeatureGeometry(featureId, { type: 'Polygon', coordinates: original })
      }
    }
  }, [map, moving])

  // leaving edit mode mid-move cancels it (set while rendering, not in an effect)
  if (!active && moving) setMoving(null)

  const deleting = territories.find((t) => t.id === deletingId)
  const editing = territories.find((t) => t.id === editingId)

  // PUT replaces every field. Faction and color apply to the territory on every date (all its shapes);
  // the creation date moves its first shape. The territory's own fields follow its latest shape
  const handleEditSubmit = async (values: TerritoryFormValues & { factionId: number }, createdMs: number | null, endMs: number | null) => {
    if (!editing) return
    const { factionId, color, layerId } = values
    let history = (editing.history ?? []).map((s) => ({ ...s, factionId, color }))
    const from = new Date(createdMs ?? 0).toISOString() // 1970 = "always" (see withShapeAt)
    if (history.length > 0) history[0] = { ...history[0], from }
    else if (createdMs !== null) history = [{ from, points: editing.points, factionId, color }]
    const latest = history[history.length - 1]
    const saved = await editTerritory(mapId, editing.id, {
      name: editing.name,
      points: latest?.points ?? editing.points,
      factionId,
      color,
      layerId,
      history,
      endTime: endMs === null ? null : new Date(endMs).toISOString(),
    })
    onUpdated(saved)
    setEditingId(null)
  }

  const overlays = (
    <>
      {menu && active && (
        <div
          className="fixed z-50 min-w-40 bg-neutral-900 py-1 text-sm text-gray-300 shadow-xl ring-1 ring-white/10"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            type="button"
            onClick={() => {
              setEditingId(menu.id)
              setContextMenu(null)
            }}
            className="block w-full px-3 py-1.5 text-left hover:bg-accent-400/15 hover:text-accent-300"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              // from the panel there's no right-clicked spot: hold it by its middle
              const territory = territories.find((t) => t.id === menu.id)
              const anchor = menu.lngLat ?? (territory && boundsOf(territory).getCenter())
              if (anchor) setMoving({ territoryId: menu.id, anchor })
              setContextMenu(null)
            }}
            className="block w-full px-3 py-1.5 text-left hover:bg-accent-400/15 hover:text-accent-300"
          >
            Move
          </button>
          <button
            type="button"
            onClick={() => {
              setDeletingId(menu.id)
              setContextMenu(null)
            }}
            className="block w-full px-3 py-1.5 text-left hover:bg-red-500/15 hover:text-red-400"
          >
            Delete
          </button>
        </div>
      )}
      {deletingId !== null && (
        <ConfirmDialog
          title={`Delete ${deleting?.name ? `"${deleting.name}"` : 'this territory'}?`}
          message="The entire territory will be removed from the map's history: every shape it had on every date of the timeline, not just from now on."
          onConfirm={() => {
            const territoryId = deletingId
            setDeletingId(null)
            deleteTerritory(mapId, territoryId)
              .then(() => onDeleted(territoryId)) // a new territories list redraws without it
              .catch(() => onError('Could not delete territory'))
          }}
          onCancel={() => setDeletingId(null)}
        />
      )}
      {editing && (
        <TerritoryForm
          key={editing.id}
          heading="Edit Territory"
          submitLabel="Save"
          initial={territoryToFormValues(editing)}
          factions={factions}
          layers={layers}
          requireCreated={false}
          maxCreated={latestCreation(editing)}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditingId(null)}
        />
      )}
    </>
  )

  if (!pendingPoints) return overlays

  const resetForm = () => {
    setPendingPoints(null)
    setPendingFeatureId(null)
  }

  const handleSubmit = async (values: TerritoryFormValues & { factionId: number }, createdMs: number | null, endMs: number | null) => {
    const { factionId, color, layerId } = values
    const created = createdMs ?? 0 // empty = it has always been there: a 1970 first shape (see withShapeAt)
    const territory = await createTerritory(mapId, {
      name: '',
      color,
      points: pendingPoints,
      factionId,
      layerId,
      // the creation time is the first history entry's `from`
      history: [{ from: new Date(created).toISOString(), points: pendingPoints, factionId, color }],
      endTime: endMs === null ? null : new Date(endMs).toISOString(),
    })
    // territories changes -> reload effect replaces the drawn shape with the saved one
    onCreated(territory)
    resetForm()
  }

  // drop the unsaved shape from the map
  const handleCancel = () => {
    if (pendingFeatureId != null) terraDrawRef.current?.removeFeatures([pendingFeatureId])
    resetForm()
  }

  return (
    <>
      {overlays}
      <TerritoryForm
        key={pendingFeatureId ?? ''}
        heading="New Territory"
        submitLabel="Add Territory"
        initial={{ factionId: '', layerId: null, color: '#ff0000', createdAt: '', ongoing: true, endTime: toLocalInput(drawnAt) }}
        factions={factions}
        layers={layers}
        requireCreated={false}
        maxCreated={{ time: drawnAt, message: "Creation can't be in the future" }}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </>
  )
}

export default TerritoryLayer
