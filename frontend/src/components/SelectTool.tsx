import { useEffect, useRef } from 'react'
import type { GeoJSONSource, MapLayerMouseEvent, MapMouseEvent } from 'maplibre-gl'
import { useMap, useSelection } from '../store/MapContext'
import { EVENTS_CLUSTER_LAYER_ID, EVENTS_LAYER_ID, EVENTS_SOURCE_ID, RELATIONS_END_LAYER_ID } from '../map/mapLayers'
import { findAnnotationAt } from '../map/annotationHitTest'
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

  // override terra-draw default cursor when select mode is enabled in editmode
  useEffect(() => {
    if (!map) return
    const container = map.getContainer()
    container.classList.toggle('select-tool', active)
    return () => container.classList.remove('select-tool')
  }, [map, active])


  // Select tool: one handler decides what was clicked
  useEffect(() => {
    if (!map || !active) return

    const handleClick = (e: MapMouseEvent) => {
      // topmost first: events and clusters are drawn above annotations
      // (RELATIONS_END_LAYER_ID: the Relations toggle's faint markers for events that have ended)
      const layers = [EVENTS_CLUSTER_LAYER_ID, EVENTS_LAYER_ID, RELATIONS_END_LAYER_ID].filter((id) => map.getLayer(id))
      const hit = layers.length ? map.queryRenderedFeatures(e.point, { layers })[0] : undefined

      if (hit?.layer.id === EVENTS_CLUSTER_LAYER_ID) return // the cluster handler zooms in
      if (hit?.layer.id === EVENTS_LAYER_ID || hit?.layer.id === RELATIONS_END_LAYER_ID) {
        setSelected({ type: 'event', id: hit.properties.id as number })
        return
      }
      // annotations: checked against their drawn circle (see annotationHitTest.ts)
      const annotationId = findAnnotationAt(map, e.point)
      if (annotationId != null) {
        setSelected({ type: 'annotation', id: annotationId })
        return
      }
      if (editMode) {
        // terra-draw picks territories while editing; an empty click only drops an event/annotation selection
        setSelected((prev) => (prev?.type === 'event' || prev?.type === 'annotation' ? null : prev))
        return
      }
      // view mode: read-only territory picking (terra-draw's select mode would allow dragging edits)
      const territory = findTerritoryAt(territoriesRef.current, e.lngLat)
      setSelected(territory ? { type: 'territory', id: territory.id } : null)
    }

    map.on('click', handleClick)
    return () => {
      map.off('click', handleClick)
    }
  }, [map, active, editMode, setSelected])

  // leaving the Select tool (e.g. back to Pan) drops whatever was selected
  useEffect(() => {
    if (!active) setSelected(null)
  }, [active, setSelected])

  return null
}

export default SelectTool
