import { useEffect, useState } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { useMap, useSelection } from '../store/MapContext'
import type { Annotation, AnnotationKind, Faction } from '../types/types'
import { ANNOTATIONS_SELECTED_LAYER_ID, ANNOTATIONS_SELECTED_LINE_LAYER_ID, ANNOTATIONS_SOURCE_ID, annotationImageId } from '../map/mapLayers'
import { addAnnotationLayers, removeAnnotationLayers } from '../map/annotationLayers'
import { ANNOTATION_KINDS, ANNOTATION_KIND_LIST } from '../map/annotationKinds'
import { ACCENT } from '../styles/colors'

const DEFAULT_COLOR = ACCENT // accent, for annotations with neither their own color nor a faction
// annotations are bitmaps on the map (symbol layers can't draw vectors), stretched by icon-size.
// Drawn large so they stay sharp when scaled up: 256px shown as 32px at size 1 (pixelRatio 8),
// i.e. crisp up to ~4x on high-density screens (~8x on normal ones). The normal on-screen size is
// still 32px, which the selection ring in annotationLayers.ts assumes
const ICON_PX = 256
const ICON_DISPLAY_PX = 32
const ICON_PIXEL_RATIO = ICON_PX / ICON_DISPLAY_PX

type KindIcons = Record<AnnotationKind, HTMLImageElement>

async function loadImage(url: string) {
  const img = new Image()
  img.src = url
  await img.decode()
  return img
}

// every kind's icon, loaded once
async function loadKindIcons(): Promise<KindIcons> {
  const loaded = await Promise.all(
    ANNOTATION_KIND_LIST.map(async (kind) => [kind, await loadImage(ANNOTATION_KINDS[kind].icon)] as const),
  )
  return Object.fromEntries(loaded) as KindIcons
}

// the annotation's own color, else its faction's, else the default
function colorOf(annotation: Annotation, colorByFaction: Map<number, string>) {
  return annotation.color ?? (annotation.factionId != null ? colorByFaction.get(annotation.factionId) : undefined) ?? DEFAULT_COLOR
}

// drawn lines as lines, the rest as points (the icon is stamped at the point); other geometries are skipped
function annotationsToGeoJSON(annotations: Annotation[], factions: Faction[]): GeoJSON.FeatureCollection {
  const colorByFaction = new Map(factions.map((f) => [f.id, f.color]))
  const features: GeoJSON.Feature[] = []
  for (const a of annotations) {
    if (a.line) {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: JSON.parse(a.line) },
        properties: { id: a.id, color: colorOf(a, colorByFaction), dashed: a.dashed === true, label: a.label ?? '' },
      })
      continue
    }
    const geometry = JSON.parse(a.geometry) as GeoJSON.Geometry
    if (geometry.type !== 'Point') continue
    features.push({
      type: 'Feature',
      geometry,
      // the layer picks its image from kind + color (see annotationImageId) and sizes it by scale
      properties: { id: a.id, kind: a.kind, color: colorOf(a, colorByFaction), scale: a.scale ?? 1, rotation: a.rotation ?? 0, label: a.label ?? '' },
    })
  }
  return { type: 'FeatureCollection', features }
}

// one annotation image: the kind's line drawing recolored to `color`, with a dark glow so it
// stays readable on any map or territory color
function drawAnnotationImage(icon: HTMLImageElement, color: string) {
  // the drawings are black lines: recolor them on their own canvas first
  const tinted = document.createElement('canvas')
  tinted.width = tinted.height = ICON_PX
  const tintedCtx = tinted.getContext('2d')!
  tintedCtx.drawImage(icon, 0, 0, ICON_PX, ICON_PX)
  tintedCtx.globalCompositeOperation = 'source-in' // keep the icon's shape, replace its color
  tintedCtx.fillStyle = color
  tintedCtx.fillRect(0, 0, ICON_PX, ICON_PX)

  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = ICON_PX
  const ctx = canvas.getContext('2d')!
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
  ctx.shadowBlur = ICON_PIXEL_RATIO * 2 // same glow on screen as before, at the higher resolution
  ctx.drawImage(tinted, 0, 0)

  return ctx.getImageData(0, 0, ICON_PX, ICON_PX)
}

// annotations drawn by the map itself (GeoJSON source + symbol layer, see annotationLayers.ts):
// each kind's icon at its point, in its color, sized by its scale
function AnnotationLayer({ annotations, factions }: { annotations: Annotation[]; factions: Faction[] }) {
  const map = useMap()
  const [selected] = useSelection()
  // the icons every annotation image is drawn from; annotations wait until they've loaded
  const [icons, setIcons] = useState<KindIcons | null>(null)

  useEffect(() => {
    let cancelled = false
    loadKindIcons().then((loaded) => {
      if (!cancelled) setIcons(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // source + layer, once per map
  useEffect(() => {
    if (!map) return
    addAnnotationLayers(map)
    return () => removeAnnotationLayers(map)
  }, [map])

  // data: create each (kind, color) image in use before setting data that needs it (same reason as
  // EventMarkers: MapLibre's on-demand 'styleimagemissing' only reliably fills one image per draw)
  useEffect(() => {
    if (!map || !icons) return
    const source = map.getSource(ANNOTATIONS_SOURCE_ID) as GeoJSONSource | undefined
    if (!source) return

    const data = annotationsToGeoJSON(annotations, factions)
    for (const feature of data.features) {
      if (feature.geometry.type !== 'Point') continue // lines need no image
      const { kind, color } = feature.properties as { kind: AnnotationKind; color: string }
      const imageId = annotationImageId(kind, color)
      if (!map.hasImage(imageId)) map.addImage(imageId, drawAnnotationImage(icons[kind], color), { pixelRatio: ICON_PIXEL_RATIO })
    }
    source.setData(data)
  }, [map, icons, annotations, factions])

  // selected annotation: show the accent ring (or a line's glow) under it
  useEffect(() => {
    if (!map?.getLayer(ANNOTATIONS_SELECTED_LAYER_ID)) return
    const selectedId = selected?.type === 'annotation' ? selected.id : -1
    map.setFilter(ANNOTATIONS_SELECTED_LAYER_ID, ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'id'], selectedId]])
    map.setFilter(ANNOTATIONS_SELECTED_LINE_LAYER_ID, ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'id'], selectedId]])
  }, [map, selected])

  return null
}

export default AnnotationLayer
