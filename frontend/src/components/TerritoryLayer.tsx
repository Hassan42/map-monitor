import { useEffect, useRef, useState } from 'react'
import type { SubmitEvent } from 'react'
import { MaplibreTerradrawControl } from '@watergis/maplibre-gl-terradraw'
import '@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.css'
import { TerraDrawPolygonMode, TerraDrawSelectMode, TerraDrawFreehandMode } from 'terra-draw'
import type { TerraDrawMouseEvent } from 'terra-draw'
import type { MapMouseEvent } from 'maplibre-gl'
import type { TerraDraw, GeoJSONStoreFeatures, HexColor } from 'terra-draw'
import { useMap, useSelection } from '../store/MapContext'
import { createTerritory, deleteTerritory, editTerritory } from '../api/territory'
import { toLocalInput } from './eventFormValues'
import { carryEditForward, laterStateCount, withShapeAt } from '../map/territoryTime'
import { parseServerTime } from '../map/eventTime'
import ChoiceDialog from './ChoiceDialog'
import ConfirmDialog from './ConfirmDialog'
import type { DrawMode, Faction, Territory } from '../types/types'
import { EVENTS_CLUSTER_LAYER_ID, EVENTS_LAYER_ID } from '../map/mapLayers'
import { findAnnotationAt } from '../map/annotationHitTest'
import { formOverlayClass, formClass, formTitleClass, formFieldClass, formInputClass, formColorInputClass, formPrimaryButtonClass, formSecondaryButtonClass, formErrorClass } from '../styles/formStyles'

// saved territories carry their color in properties; new unsaved drawings fall back to blue
const territoryColor = (f: GeoJSONStoreFeatures) => (f.properties.color as HexColor | undefined) ?? '#3f97e0'

// view-mode selection (set by the highlight effect); styled like terra-draw's edit-mode selection
const isHighlighted = (f: GeoJSONStoreFeatures) => f.properties.highlighted === true


// select-mode finish actions that change a polygon's shape
const EDIT_ACTIONS = ['edit', 'deleteCoordinate', 'insertMidpoint', 'dragCoordinate', 'dragFeature', 'dragCoordinateResize']

function TerritoryLayer({
  mapId,
  factions,
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
  const [name, setName] = useState('')
  const [color, setColor] = useState('#ff0000')
  const [factionId, setFactionId] = useState<number | ''>('')
  // when the territory was created and when it ended (datetime-local values); ongoing = no end yet.
  // Filled in when a shape is drawn, with "now" also as the latest allowed time
  const [createdAt, setCreatedAt] = useState('')
  const [endTime, setEndTime] = useState('')
  const [ongoing, setOngoing] = useState(true)
  const [latest, setLatest] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const terraDrawRef = useRef<TerraDraw | null>(null)
  // latest territories for the terra-draw handlers, which are only created once
  const territoriesRef = useRef(territories)
  // the timeline's date for the terra-draw handlers, which are only created once
  const nowRef = useRef(now)
  // right-click menu on a territory (where, and which one), and the territory waiting for "really delete?"
  const [menu, setMenu] = useState<{ x: number; y: number; territoryId: number } | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  // a reshaped territory whose later shapes exist: waiting for "only until then, or also later?"
  const [pendingSave, setPendingSave] = useState<{ territory: Territory; points: string } | null>(null)

  // saves a reshaped polygon as its shape from the timeline's date on (withShapeAt); with `carry`, the
  // edit also goes into later shapes wherever they still have the changed stretches (carryEditForward).
  // `territory` is the version shown at that date - it carries the full history
  const saveShape = (territory: Territory, points: string, carry: boolean) => {
    const at = nowRef.current
    let updated = withShapeAt(territory, { points, factionId: territory.factionId, color: territory.color }, at)
    if (carry) updated = carryEditForward(updated, territory.points, points, at)
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
          // left empty on purpose: the control fills in its default flags (drag/edit rules) for any mode not listed
          flags: {},
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
      setSelected((prev) => (prev?.type === 'territory' ? null : prev))
      if (!editedFeatureIds.delete(id)) return

      // gone from the snapshot means it was deleted, which handleFeatureDeleted takes care of
      const feature = terraDraw.getSnapshot().find((f) => f.id === id)
      const territoryId = feature?.properties.territoryId as number | undefined
      const territory = territoriesRef.current.find((t) => t.id === territoryId)
      if (!feature || !territory) return

      // the new shape holds from the timeline's date on. If the territory changes again later, ask
      // whether this edit should go into those later shapes too
      const points = JSON.stringify(feature.geometry.coordinates)
      if (laterStateCount(territory, nowRef.current) > 0) setPendingSave({ territory, points })
      else saveShapeRef.current(territory, points, false)
    }
    const handleFinish = (id: string | number, context: { action: string }) => {
      if (context.action === 'draw') {
        const feature = terraDraw.getSnapshot().find((f) => f.id === id)
        if (!feature) return
        setPendingPoints(JSON.stringify(feature.geometry.coordinates))
        setPendingFeatureId(id)
        const nowInput = toLocalInput(Date.now())
        setCreatedAt(nowInput)
        setEndTime(nowInput)
        setLatest(nowInput)
        onModeChange(null)
        return
      }

      // reshaped an existing territory: just remember it, handleDeselect saves it
      if (EDIT_ACTIONS.includes(context.action)) editedFeatureIds.add(id)
    }

    // fired by the toolbar's delete-selection button, after the features are already gone from terra-draw
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
    terraDraw.on('deselect', handleDeselect)
    terraDraw.on('finish', handleFinish)
    draw.on('feature-deleted', handleFeatureDeleted)

    return () => {
      terraDraw.off('select', handleSelect)
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

    const features: GeoJSONStoreFeatures[] = territories.map((t) => ({
      type: 'Feature',
      id: terraDraw.getFeatureId(),
      geometry: { type: 'Polygon', coordinates: JSON.parse(t.points) },
      properties: { mode: 'polygon', territoryId: t.id, color: t.color },
    }))
    terraDraw.clear()
    terraDraw.addFeatures(features)
    featureToTerritoryRef.current = new Map(features.map((f) => [f.id!, f.properties.territoryId as number]))
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
      setMenu({ x: e.originalEvent.clientX, y: e.originalEvent.clientY, territoryId: feature.properties.territoryId as number })
    }
    map.on('contextmenu', handleRightClick)
    return () => {
      map.off('contextmenu', handleRightClick)
    }
  }, [map, active])

  // the menu closes on a click elsewhere, when the map moves, on Escape, or when leaving edit mode
  useEffect(() => {
    if (!map || !menu) return
    const close = () => setMenu(null)
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
  }, [map, menu])

  const deleting = territories.find((t) => t.id === deletingId)

  // the date the edited territory next changes (for the question), and how to undo the edit:
  // a territories update makes terra-draw reload, putting the saved shapes back
  const nextChange = pendingSave
    ? (pendingSave.territory.history ?? []).map((s) => parseServerTime(s.from)).find((t) => t > now)
    : undefined
  const undoPendingSave = () => {
    if (!pendingSave) return
    const { territory } = pendingSave
    const latest = territory.history?.at(-1)
    // the shown version has that date's shape in its own fields; put the latest state's back
    onUpdated(latest ? { ...territory, points: latest.points, factionId: latest.factionId, color: latest.color } : territory)
    setPendingSave(null)
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
              setDeletingId(menu.territoryId)
              setMenu(null)
            }}
            className="block w-full px-3 py-1.5 text-left hover:bg-red-500/15 hover:text-red-400"
          >
            Delete
          </button>
        </div>
      )}
      {pendingSave && (
        <ChoiceDialog
          title="Change later shapes too?"
          message={`This territory changes again on ${nextChange ? new Date(nextChange).toLocaleDateString() : 'a later date'}. Should your edit also go into the shapes after that? Only the parts you changed are carried over, where the later shapes still have them as they were - their own changes stay.`}
          choices={[
            {
              label: 'Also apply to later shapes',
              onSelect: () => {
                saveShapeRef.current(pendingSave.territory, pendingSave.points, true)
                setPendingSave(null)
              },
            },
            {
              label: `Only until ${nextChange ? new Date(nextChange).toLocaleDateString() : 'the next change'}`,
              onSelect: () => {
                saveShapeRef.current(pendingSave.territory, pendingSave.points, false)
                setPendingSave(null)
              },
            },
          ]}
          cancelLabel="Undo edit"
          onCancel={undoPendingSave}
        />
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
    </>
  )

  if (!pendingPoints) return overlays

  const resetForm = () => {
    setPendingPoints(null)
    setPendingFeatureId(null)
    setName('')
    setColor('#ff0000')
    setFactionId('')
    setOngoing(true)
  }

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    if (factionId === '') return
    const createdMs = new Date(createdAt).getTime()
    const endMs = new Date(endTime).getTime()
    if (Number.isNaN(createdMs)) return setError('Pick when it was created')
    if (createdMs > Date.now()) return setError("Creation can't be in the future")
    if (!ongoing && (Number.isNaN(endMs) || endMs < createdMs)) return setError("The end can't be before the creation")
    setError('')
    setLoading(true)
    try {
      const territory = await createTerritory(mapId, {
        name,
        color,
        points: pendingPoints,
        factionId,
        // the creation time is the first history entry's `from`
        history: [{ from: new Date(createdMs).toISOString(), points: pendingPoints, factionId, color }],
        endTime: ongoing ? null : new Date(endMs).toISOString(),
      })
      // territories changes -> reload effect replaces the drawn shape with the saved one
      onCreated(territory)
      resetForm()
    } catch {
      setError('Could not create territory')
    } finally {
      setLoading(false)
    }
  }

  // drop the unsaved shape from the map
  const handleCancel = () => {
    if (pendingFeatureId != null) terraDrawRef.current?.removeFeatures([pendingFeatureId])
    resetForm()
  }

  return (
    <>
      {overlays}
      <div className={formOverlayClass}>
        <form onSubmit={handleSubmit} className={formClass}>
          <h2 className={formTitleClass}>New Territory</h2>
          {/* <div className={formFieldClass}>
            <label htmlFor="territory-name">Name:</label>
            <input type="text" id="territory-name" value={name} onChange={(e) => setName(e.target.value)} className={formInputClass} />
          </div> */}
          <div className={formFieldClass}>
            <label htmlFor="territory-faction">Faction:</label>
            {factions.length === 0 ? (
              <p className={formErrorClass}>Create a faction first.</p>
            ) : (
              <select
                id="territory-faction"
                value={factionId}
                onChange={
                  (e) => {
                    const id = Number(e.target.value)
                    setFactionId(id)
                    const faction = factions.find((f) => f.id === id)
                    if (faction) setColor(faction.color)
                  }
                }
                className={formInputClass}
              >
                <option value="" disabled>Select a faction</option>
                {factions.map((faction) => (
                  <option key={faction.id} value={faction.id}>{faction.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className={formFieldClass}>
            <label htmlFor="territory-created">Created:</label>
            <input
              type="datetime-local"
              id="territory-created"
              value={createdAt}
              max={latest}
              onChange={(e) => setCreatedAt(e.target.value)}
              className={formInputClass}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ongoing}
              onChange={(e) => setOngoing(e.target.checked)}
              className="accent-accent-400"
            />
            Ongoing (no end yet)
          </label>
          <div className={formFieldClass}>
            <label htmlFor="territory-end" className={ongoing ? 'text-gray-500' : ''}>End date:</label>
            <input
              type="datetime-local"
              id="territory-end"
              value={endTime}
              disabled={ongoing}
              onChange={(e) => setEndTime(e.target.value)}
              className={`${formInputClass} disabled:cursor-not-allowed disabled:opacity-40`}
            />
          </div>
          <div className={formFieldClass}>
            <label htmlFor="territory-color">Color:</label>
            <input type="color" id="territory-color" value={color} onChange={(e) => setColor(e.target.value)} className={formColorInputClass} />
          </div>
          {error && <p className={formErrorClass}>{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={loading || factions.length === 0} className={formPrimaryButtonClass}>
              {loading ? 'Adding...' : 'Add Territory'}
            </button>
            <button type="button" onClick={handleCancel} className={formSecondaryButtonClass}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

export default TerritoryLayer
