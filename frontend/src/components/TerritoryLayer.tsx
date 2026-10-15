import { useEffect, useRef, useState } from 'react'
import type { SubmitEvent } from 'react'
import { MaplibreTerradrawControl } from '@watergis/maplibre-gl-terradraw'
import '@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.css'
import { TerraDrawPolygonMode, TerraDrawSelectMode, TerraDrawFreehandMode } from 'terra-draw'
import type { TerraDrawMouseEvent } from 'terra-draw'
import type { TerraDraw, GeoJSONStoreFeatures, HexColor } from 'terra-draw'
import { useMap, useSelection } from '../store/MapContext'
import { createTerritory, deleteTerritory, editTerritory } from '../api/territory'
import type { DrawMode, Faction, Territory } from '../types/types'
import { EVENTS_CLUSTER_LAYER_ID, EVENTS_LAYER_ID } from '../map/mapLayers'
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
}) {
  const map = useMap()
  const [selected, setSelected] = useSelection()
  const [pendingPoints, setPendingPoints] = useState<string | null>(null)
  const [pendingFeatureId, setPendingFeatureId] = useState<string | number | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#ff0000')
  const [factionId, setFactionId] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const terraDrawRef = useRef<TerraDraw | null>(null)
  // latest territories for the terra-draw handlers, which are only created once
  const territoriesRef = useRef(territories)
  // terra-draw feature id -> territory stableId; needed because a deleted feature can't be looked up anymore
  const featureToTerritoryRef = useRef(new Map<string | number, number>())


  useEffect(() => {
    territoriesRef.current = territories
  }, [territories])

  // create terra-draw once per map; it stays alive in both view and edit mode
  useEffect(() => {
    if (!map) return

    const isOverEvent = (e: TerraDrawMouseEvent) => {
      const layers = [EVENTS_LAYER_ID, EVENTS_CLUSTER_LAYER_ID].filter((id) => map.getLayer(id))
      const eventSelected = layers.length > 0 && map.queryRenderedFeatures([e.containerX, e.containerY], { layers }).length > 0
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

      // PUT replaces every field, so take the rest from the saved territory
      editTerritory(mapId, territory.id, {
        name: territory.name,
        color: territory.color,
        factionId: territory.factionId,
        points: JSON.stringify(feature.geometry.coordinates),
      })
        .then(onUpdated)
        .catch(() => onError('Could not save territory'))
    }
    const handleFinish = (id: string | number, context: { action: string }) => {
      if (context.action === 'draw') {
        const feature = terraDraw.getSnapshot().find((f) => f.id === id)
        if (!feature) return
        setPendingPoints(JSON.stringify(feature.geometry.coordinates))
        setPendingFeatureId(id)
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
      map.removeControl(draw)
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

  if (!pendingPoints) return null

  const resetForm = () => {
    setPendingPoints(null)
    setPendingFeatureId(null)
    setName('')
    setColor('#ff0000')
    setFactionId('')
  }

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    if (factionId === '') return
    setError('')
    setLoading(true)
    try {
      const territory = await createTerritory(mapId, { name, color, points: pendingPoints, factionId })
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
  )
}

export default TerritoryLayer
