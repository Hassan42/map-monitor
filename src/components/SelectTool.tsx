import { useEffect, useRef } from 'react'
import type { GeoJSONSource, MapLayerMouseEvent, MapMouseEvent } from 'maplibre-gl'
import { useMap, useSelection } from '../store/MapContext'
import { EVENTS_CLUSTER_LAYER_ID, EVENTS_LAYER_ID, EVENTS_SOURCE_ID } from '../map/mapLayers'
import { findTerritoryAt } from '../map/geometry'
import type { Territory } from '../types/types'

// every selection click in one place (renders nothing). Topmost thing wins: cluster → event → territory.
// In edit mode terra-draw selects territories itself (TerritoryLayer's select/deselect handlers),
// so there this only handles events.
function SelectTool({ active, editMode, territories }: { active: boolean; editMode: boolean; territories: Territory[] }) {
  const map = useMap()
  const [, setSelected] = useSelection()

  // latest territories for the click handler, without re-attaching it on every change
  const territoriesRef = useRef(territories)
  useEffect(() => {
    territoriesRef.current = territories
  }, [territories])

  // clusters: zoom in just far enough for the cluster to split apart, with any tool
  useEffect(() => {
    if (!map) return

    const handleClusterClick = async (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0]
      if (!feature || feature.geometry.type !== 'Point') return
      const source = map.getSource(EVENTS_SOURCE_ID) as GeoJSONSource
      const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id as number)
      map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom })
    }

    map.on('click', EVENTS_CLUSTER_LAYER_ID, handleClusterClick)
    return () => {
      map.off('click', EVENTS_CLUSTER_LAYER_ID, handleClusterClick)
    }
  }, [map])

  // Select tool: one handler decides what was clicked
  useEffect(() => {
    if (!map || !active) return

    const canvas = map.getCanvas()
    // view mode: arrow cursor; in edit mode terra-draw sets its own cursors
    if (!editMode) canvas.style.cursor = 'default'

    const handleClick = (e: MapMouseEvent) => {
      const layers = [EVENTS_CLUSTER_LAYER_ID, EVENTS_LAYER_ID].filter((id) => map.getLayer(id))
      const hit = layers.length ? map.queryRenderedFeatures(e.point, { layers })[0] : undefined

      if (hit?.layer.id === EVENTS_CLUSTER_LAYER_ID) return // the cluster handler zooms in
      if (hit) {
        setSelected({ type: 'event', id: hit.properties.id as number })
        return
      }
      if (editMode) {
        // terra-draw picks territories while editing; an empty click only drops an event selection
        setSelected((prev) => (prev?.type === 'event' ? null : prev))
        return
      }
      // view mode: read-only territory picking (terra-draw's select mode would allow dragging edits)
      const territory = findTerritoryAt(territoriesRef.current, e.lngLat)
      setSelected(territory ? { type: 'territory', id: territory.id } : null)
    }

    map.on('click', handleClick)
    return () => {
      if (!editMode) canvas.style.cursor = ''
      map.off('click', handleClick)
    }
  }, [map, active, editMode, setSelected])

  // leaving the Select tool (e.g. back to Pan) drops whatever was selected
  useEffect(() => {
    if (!active) setSelected(null)
  }, [active, setSelected])

  // pointer cursor over clusters (always) and events (Select tool only);
  // restores whatever cursor the active tool had on leave
  useEffect(() => {
    if (!map) return

    const layers = active ? [EVENTS_CLUSTER_LAYER_ID, EVENTS_LAYER_ID] : [EVENTS_CLUSTER_LAYER_ID]
    const canvas = map.getCanvas()
    let previousCursor = ''
    const handleEnter = () => {
      previousCursor = canvas.style.cursor
      canvas.style.cursor = 'pointer'
    }
    const handleLeave = () => {
      canvas.style.cursor = previousCursor
    }

    for (const id of layers) {
      map.on('mouseenter', id, handleEnter)
      map.on('mouseleave', id, handleLeave)
    }
    return () => {
      for (const id of layers) {
        map.off('mouseenter', id, handleEnter)
        map.off('mouseleave', id, handleLeave)
      }
    }
  }, [map, active])

  return null
}

export default SelectTool
