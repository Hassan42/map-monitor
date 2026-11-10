import { useEffect, useRef, useState } from 'react'
import type { MapMouseEvent, MapTouchEvent } from 'maplibre-gl'
import { useContextMenu, useMap, useSelection } from '../store/MapContext'
import type { Annotation, Faction, Layer } from '../types/types'
import { annotationLook } from '../map/annotationKinds'
import { moveAnnotationTo } from '../map/annotationLine'
import { findAnnotationAt } from '../map/annotationHitTest'
import AnnotationForm from './AnnotationForm'
import ConfirmDialog from './ConfirmDialog'
import { annotationToFormValues } from './annotationFormValues'

// what dragging on the map does while an annotation is selected ('move': nothing - moving is the
// follow-the-pointer Move, from the panel or the right-click menu)
type Mode = 'move' | 'rotate' | 'scale'

const SCALE_DRAG_PX = 150 // dragging up this far doubles the size, down halves it

const normalizeRotation = (degrees: number) => ((degrees % 360) + 360) % 360

// edit mode: right-click an annotation > Move (or the panel's Move) makes it follow the pointer until a
// click puts it down; dragging doesn't move it, so a stray drag can't shift it. The selected one gets a
// panel with Rotate and Scale modes: in those, dragging anywhere on the map rotates it (around its
// center) or resizes it (up = bigger, down = smaller). onChange updates the map live; onCommit saves
function AnnotationEditor({
  annotations,
  factions,
  layers,
  active,
  aboveTimeline,
  onChange,
  onCommit,
  onDelete,
}: {
  annotations: Annotation[]
  factions: Faction[]
  layers: Layer[]
  active: boolean
  aboveTimeline: boolean // the timeline is showing: sit above it instead of on top of it
  onChange: (annotation: Annotation) => void
  onCommit: (annotation: Annotation) => void
  onDelete: (annotationId: number) => void
}) {
  const map = useMap()
  const [selected, setSelected] = useSelection()

  // the mode belongs to the annotation it was picked for: selecting another one starts in 'move'
  const selectedId = active && selected?.type === 'annotation' ? selected.id : null
  const [modeFor, setModeFor] = useState<{ id: number; mode: Mode } | null>(null)
  const mode = modeFor?.id === selectedId ? modeFor.mode : 'move'

  useEffect(() => {
    if (selectedId == null) {
      setModeFor(null)
      return
    }

    setModeFor({ id: selectedId, mode: 'move' })
  }, [selectedId])

  // right-click menu on an annotation (from the map or the property panel); Move makes it follow the pointer
  const [contextMenu, setContextMenu] = useContextMenu()
  const menu = contextMenu?.type === 'annotation' ? contextMenu : null
  const [movingId, setMovingId] = useState<number | null>(null)
  // the annotation whose edit form is open (right-click > Edit)
  const [editingId, setEditingId] = useState<number | null>(null)
  // the annotation waiting for "really delete?"
  const [deletingId, setDeletingId] = useState<number | null>(null)
  // leaving edit mode mid-move cancels it (set while rendering, not in an effect)
  if (!active && movingId != null) setMovingId(null)

  // the map listeners are attached once per move or drag mode; they read the latest values from here
  const latestRef = useRef({ annotations, onChange, onCommit })
  useEffect(() => {
    latestRef.current = { annotations, onChange, onCommit }
  }, [annotations, onChange, onCommit])

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

  // right-click an annotation in edit mode: open its menu (the territory menu skips annotations)
  useEffect(() => {
    if (!map || !active) return
    const handleRightClick = (e: MapMouseEvent) => {
      const id = findAnnotationAt(map, e.point)
      if (id == null) return
      e.preventDefault()
      setContextMenu({ type: 'annotation', id, x: e.originalEvent.clientX, y: e.originalEvent.clientY, lngLat: e.lngLat })
    }
    map.on('contextmenu', handleRightClick)
    return () => {
      map.off('contextmenu', handleRightClick)
    }
  }, [map, active, setContextMenu])

  // the menu closes on a click elsewhere, when the map moves, or on Escape
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

  // moving (right-click > Move): the annotation follows the pointer, a click puts it down and saves it,
  // Escape puts it back. No need to select it first
  useEffect(() => {
    const original = latestRef.current.annotations.find((a) => a.id === movingId)
    if (!map || !original) return
    const container = map.getContainer()
    container.classList.add('map-moving')
    let moved: Annotation | null = null
    let placed = false

    const handleMove = (e: MapMouseEvent) => {
      moved = moveAnnotationTo(original, e.lngLat)
      latestRef.current.onChange(moved)
    }
    const handleClick = (e: MapMouseEvent) => {
      handleMove(e) // the click's own spot is the final one
      placed = true
      setMovingId(null)
      if (moved) latestRef.current.onCommit(moved)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMovingId(null)
    }
    map.on('mousemove', handleMove)
    map.on('click', handleClick)
    window.addEventListener('keydown', onKey)
    return () => {
      map.off('mousemove', handleMove)
      map.off('click', handleClick)
      window.removeEventListener('keydown', onKey)
      container.classList.remove('map-moving')
      if (!placed && moved) latestRef.current.onChange(original) // Escape or leaving edit mode: put it back
    }
  }, [map, movingId])

  const editing = active ? annotations.find((a) => a.id === editingId) : undefined
  const deleting = active ? annotations.find((a) => a.id === deletingId) : undefined

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
            setMovingId(menu.id)
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
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.label ? `"${deleting.label}"` : `this ${annotationLook(deleting).label.toLowerCase()}`}?`}
          message="It's removed from this draft. It stays on the published map until you publish, and you can undo it from the publish menu before then."
          onConfirm={() => {
            setSelected((prev) => (prev?.type === 'annotation' && prev.id === deleting.id ? null : prev))
            setDeletingId(null)
            onDelete(deleting.id)
          }}
          onCancel={() => setDeletingId(null)}
        />
      )}
      {editing && (
        <AnnotationForm
          key={editing.id}
          heading={editing.line ? (editing.arrow ? 'Edit Arrow' : 'Edit Line') : 'Edit Annotation'}
          submitLabel="Save"
          initial={annotationToFormValues(editing)}
          isLine={editing.line != null}
          factions={factions}
          layers={layers}
          onSubmit={async (fields) => {
            const updated = { ...editing, ...fields }
            latestRef.current.onChange(updated) // shows right away; onCommit saves it
            latestRef.current.onCommit(updated)
            setEditingId(null)
          }}
          onCancel={() => setEditingId(null)}
        />
      )}
    </>
  )

  const annotation = selectedId != null ? annotations.find((a) => a.id === selectedId) : undefined
  if (!annotation) return overlays

  // clicking the active mode again goes back to moving
  const toggleMode = (next: Mode) => setModeFor({ id: annotation.id, mode: mode === next ? 'move' : next })
  const modeButtonClass = (m: Mode) =>
    `flex items-center gap-2 px-3 py-1.5 transition-colors ${mode === m ? 'bg-accent-400/15 text-accent-300' : 'hover:bg-accent-400/15 hover:text-accent-300'
    }`

  return (
    <>
      {overlays}
      {/* centered over the map area (the property panel takes the right 24rem) */}
      {/* phones: across the screen, above the timeline or the property sheet's bar */}
      <div className={`fixed ${aboveTimeline ? 'bottom-[11rem] md:bottom-40' : 'bottom-16 md:bottom-6'} left-[calc((100%-24rem)/2)] max-md:inset-x-2 max-md:translate-x-0 max-md:flex-wrap max-md:justify-center z-40 flex -translate-x-1/2 items-center gap-2 bg-neutral-900 px-4 py-2 text-sm text-gray-300 shadow-xl ring-1 ring-white/10`}>
        <span className="mr-2 font-semibold text-white">{annotation.label || annotationLook(annotation).label}</span>
        <button
          type="button"
          aria-pressed={movingId === annotation.id}
          onClick={() => {
            setModeFor({ id: annotation.id, mode: 'move' }) // rotate/scale would grab the placing click
            setMovingId(movingId === annotation.id ? null : annotation.id)
          }}
          className={`flex items-center gap-2 px-3 py-1.5 transition-colors ${movingId === annotation.id ? 'bg-accent-400/15 text-accent-300' : 'hover:bg-accent-400/15 hover:text-accent-300'}`}
        >
          ⊹ Move
          {/* <span className="tabular-nums text-gray-400">{Math.round(annotation.rotation)}°</span> */}
        </button>
        {/* a line has no icon to turn or resize */}
        {!annotation.line && (
          <>
            <button type="button" aria-pressed={mode === 'rotate'} onClick={() => toggleMode('rotate')} className={modeButtonClass('rotate')}>
              ⟳ Rotate
              {/* <span className="tabular-nums text-gray-400">{Math.round(annotation.rotation)}°</span> */}
            </button>
            <button type="button" aria-pressed={mode === 'scale'} onClick={() => toggleMode('scale')} className={modeButtonClass('scale')}>
              ⇕ Scale
              <span className="tabular-nums text-gray-400">{annotation.scale.toFixed(2)}x</span>
            </button>
          </>
        )}

        <span className="ml-2 text-xs text-gray-500 max-md:hidden">
          {mode === 'rotate' && 'Drag to rotate'}
          {mode === 'scale' && 'Drag up or down to resize'}
          {mode === 'move' && (movingId === annotation.id ? 'Click to put it down, Esc to cancel' : annotation.line ? 'Pick Move to shift it' : 'Pick Move, Rotate or Scale')}
        </span>
      </div>
    </>
  )
}

export default AnnotationEditor
