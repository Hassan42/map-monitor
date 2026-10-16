import { useEffect, useRef, useState } from 'react'
import type { MapMouseEvent, MapTouchEvent } from 'maplibre-gl'
import { useMap, useSelection } from '../store/MapContext'
import type { Annotation } from '../types/types'
import { ANNOTATION_KINDS } from '../map/annotationKinds'
import { findAnnotationAt } from '../map/annotationHitTest'

// what dragging on the map does while an annotation is selected
type Mode = 'move' | 'rotate' | 'scale'

const SCALE_DRAG_PX = 150 // dragging up this far doubles the size, down halves it

const normalizeRotation = (degrees: number) => ((degrees % 360) + 360) % 360

// edit mode: drag annotations to move them (Select tool). The selected one gets a panel with Rotate
// and Scale modes: in those, dragging anywhere on the map rotates it (around its center) or resizes it
// (up = bigger, down = smaller). onChange updates the map live; onCommit saves once a drag ends
function AnnotationEditor({
  annotations,
  active,
  canDrag,
  onChange,
  onCommit,
}: {
  annotations: Annotation[]
  active: boolean
  canDrag: boolean
  onChange: (annotation: Annotation) => void
  onCommit: (annotation: Annotation) => void
}) {
  const map = useMap()
  const [selected, setSelected] = useSelection()

  // the mode belongs to the annotation it was picked for: selecting another one starts in 'move'
  const selectedId = active && selected?.type === 'annotation' ? selected.id : null
  const [modeFor, setModeFor] = useState<{ id: number; mode: Mode } | null>(null)
  const mode: Mode = modeFor && modeFor.id === selectedId ? modeFor.mode : 'move'
  
  // the drag listeners are attached once per drag-enabled period; they read the latest values from here
  const latestRef = useRef({ annotations, onChange, onCommit })
  useEffect(() => {
    latestRef.current = { annotations, onChange, onCommit }
  }, [annotations, onChange, onCommit])

  // drag to move: press on an annotation (selects it), move, release to save the new position
  useEffect(() => {
    if (!map || !active || !canDrag || mode !== 'move') return
    const container = map.getContainer()
    let dragged: Annotation | null = null // as it was when the drag started
    let moved: Annotation | null = null // with its latest position

    const moveTo = (e: MapMouseEvent | MapTouchEvent) => {
      if (!dragged) return
      moved = { ...dragged, geometry: JSON.stringify({ type: 'Point', coordinates: [e.lngLat.lng, e.lngLat.lat] }) }
      latestRef.current.onChange(moved)
    }
    const handleMove = (e: MapMouseEvent | MapTouchEvent) => moveTo(e)

    const handleUp = (e: MapMouseEvent | MapTouchEvent) => {
      // the release point is the final position: the last move event can lag behind a fast drag
      if (moved) moveTo(e)
      map.off('mousemove', handleMove)
      map.off('touchmove', handleMove)
      // only one of mouseup/touchend fires; drop the other so they don't pile up across drags
      map.off('mouseup', handleUp)
      map.off('touchend', handleUp)
      container.classList.remove('annotation-dragging')
      if (moved) latestRef.current.onCommit(moved) // a press without moving saves nothing
      dragged = null
      moved = null
    }

    // presses anywhere on the map: only ones within an annotation's drawn circle start a drag
    // (see annotationHitTest.ts - MapLibre's own icon hit boxes are larger than what's drawn)
    const handleDown = (e: MapMouseEvent | MapTouchEvent) => {
      if ('points' in e && e.points.length !== 1) return // leave two-finger gestures (pinch zoom) to the map
      const id = findAnnotationAt(map, e.point)
      const annotation = latestRef.current.annotations.find((a) => a.id === id)
      if (!annotation) return

      e.preventDefault() // MapLibre: no map panning for this gesture
      setSelected({ type: 'annotation', id: annotation.id })
      dragged = annotation
      container.classList.add('annotation-dragging')
      map.on('mousemove', handleMove)
      map.on('touchmove', handleMove)
      map.once('mouseup', handleUp)
      map.once('touchend', handleUp)
    }

    // move cursor over annotations (same drawn-circle check); a class, not the canvas's inline
    // cursor, because terra-draw's select mode resets the inline cursor on every mouse move
    const handleHover = (e: MapMouseEvent) => {
      if (dragged) return
      container.classList.toggle('annotation-hover', findAnnotationAt(map, e.point) != null)
    }

    map.on('mousedown', handleDown)
    map.on('touchstart', handleDown)
    map.on('mousemove', handleHover)
    return () => {
      map.off('mousedown', handleDown)
      map.off('touchstart', handleDown)
      map.off('mousemove', handleHover)
      map.off('mousemove', handleMove)
      map.off('touchmove', handleMove)
      map.off('mouseup', handleUp)
      map.off('touchend', handleUp)
      container.classList.remove('annotation-hover', 'annotation-dragging')
    }
  }, [map, active, canDrag, mode, setSelected])

  // rotate / scale mode: a drag anywhere on the map transforms the selected annotation
  useEffect(() => {
    if (!map || selectedId == null || mode === 'move') return
    const container = map.getContainer()
    const modeClass = `annotation-${mode}-mode`
    container.classList.add(modeClass)

    let start: { annotation: Annotation; y: number; angle: number } | null = null
    let changed: Annotation | null = null

    // screen angle (0 = up, clockwise) from the annotation's center to the pointer
    const angleTo = (annotation: Annotation, x: number, y: number) => {
      const center = map.project(JSON.parse(annotation.geometry).coordinates as [number, number])
      return (Math.atan2(x - center.x, -(y - center.y)) * 180) / Math.PI
    }

    const handleMove = (e: MapMouseEvent | MapTouchEvent) => {
      if (!start) return
      const { annotation } = start
      changed = mode === 'rotate'
        // twist: turn by however much the pointer has turned around the center since the press
        ? { ...annotation, rotation: normalizeRotation(annotation.rotation + angleTo(annotation, e.point.x, e.point.y) - start.angle) }
        : { ...annotation, scale: annotation.scale * 2 ** ((start.y - e.point.y) / SCALE_DRAG_PX) }
      latestRef.current.onChange(changed)
    }

    const handleUp = () => {
      map.off('mousemove', handleMove)
      map.off('touchmove', handleMove)
      map.off('mouseup', handleUp)
      map.off('touchend', handleUp)
      if (changed) latestRef.current.onCommit(changed) // a press without moving saves nothing
      start = null
      changed = null
    }

    const handleDown = (e: MapMouseEvent | MapTouchEvent) => {
      if ('points' in e && e.points.length !== 1) return // leave two-finger gestures (pinch zoom) to the map
      const annotation = latestRef.current.annotations.find((a) => a.id === selectedId)
      if (!annotation) return
      e.preventDefault() // MapLibre: no map panning for this gesture
      start = { annotation, y: e.point.y, angle: angleTo(annotation, e.point.x, e.point.y) }
      map.on('mousemove', handleMove)
      map.on('touchmove', handleMove)
      map.once('mouseup', handleUp)
      map.once('touchend', handleUp)
    }

    map.on('mousedown', handleDown)
    map.on('touchstart', handleDown)
    return () => {
      map.off('mousedown', handleDown)
      map.off('touchstart', handleDown)
      map.off('mousemove', handleMove)
      map.off('touchmove', handleMove)
      map.off('mouseup', handleUp)
      map.off('touchend', handleUp)
      container.classList.remove(modeClass)
    }
  }, [map, selectedId, mode])

  const annotation = selectedId != null ? annotations.find((a) => a.id === selectedId) : undefined
  if (!annotation) return null

  // clicking the active mode again goes back to moving
  const toggleMode = (next: Mode) => setModeFor({ id: annotation.id, mode: mode === next ? 'move' : next })
  const modeButtonClass = (m: Mode) =>
    `flex items-center gap-2 px-3 py-1.5 transition-colors ${
      mode === m ? 'bg-amber-400/15 text-amber-300' : 'hover:bg-amber-400/15 hover:text-amber-300'
    }`

  return (
    // centered over the map area (the property panel takes the right 18rem)
    <div className="fixed bottom-6 left-[calc((100%-18rem)/2)] z-40 flex -translate-x-1/2 items-center gap-2 bg-neutral-900 px-4 py-2 text-sm text-gray-300 shadow-xl ring-1 ring-white/10">
      <span className="mr-2 font-semibold text-white">{annotation.label || ANNOTATION_KINDS[annotation.kind].label}</span>
      <button type="button" aria-pressed={mode === 'move'} onClick={() => toggleMode('move')} className={modeButtonClass('move')}>
        ⊹ Move
        {/* <span className="tabular-nums text-gray-400">{Math.round(annotation.rotation)}°</span> */}
      </button>
      <button type="button" aria-pressed={mode === 'rotate'} onClick={() => toggleMode('rotate')} className={modeButtonClass('rotate')}>
        ⟳ Rotate
        {/* <span className="tabular-nums text-gray-400">{Math.round(annotation.rotation)}°</span> */}
      </button>
      <button type="button" aria-pressed={mode === 'scale'} onClick={() => toggleMode('scale')} className={modeButtonClass('scale')}>
        ⇕ Scale
        <span className="tabular-nums text-gray-400">{annotation.scale.toFixed(2)}x</span>
      </button>

      <span className="ml-2 text-xs text-gray-500">
        {mode === 'rotate' && 'Drag to rotate'}
        {mode === 'scale' && 'Drag up or down to resize'}
        {mode === 'move' && 'Drag to move'}
      </span>
    </div>
  )
}

export default AnnotationEditor
