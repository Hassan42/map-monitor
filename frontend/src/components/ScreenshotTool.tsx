import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useMap } from '../store/MapContext'
import { captureArea } from '../map/captureMap'
import type { Box } from '../map/captureMap'
import { addSatelliteLayer, removeSatelliteLayer, setSatelliteVisible, SATELLITE_ATTRIBUTION } from '../map/satelliteLayer'
import { setTopoVisible } from '../map/topoLayer'
import { formOverlayClass, formClass, formTitleClass, formPrimaryButtonClass, formSecondaryButtonClass } from '../styles/formStyles'

type Background = 'street' | 'topo' | 'satellite'

const BACKGROUNDS: { id: Background; label: string }[] = [
  { id: 'street', label: 'Street' },
  { id: 'topo', label: 'Topo' },
  { id: 'satellite', label: 'Satellite' },
]

const BASE_CREDITS = '© OpenStreetMap contributors, © OpenFreeMap'
const CREDITS: Record<Background, string> = {
  street: BASE_CREDITS,
  topo: `${BASE_CREDITS}, © OpenTopoMap (CC-BY-SA)`,
  satellite: `${BASE_CREDITS}, Imagery: ${SATELLITE_ATTRIBUTION}`,
}

const MIN_BOX_PX = 40 // a smaller drag is a slip, not a selection
const TILES_TIMEOUT_MS = 15_000

// take a picture of part of the map: drag a box, pick a background in the window, download a PNG. It
// uses the main map, so events, territories, arrows and labels are in the picture as they're drawn.
// The overlay takes every pointer event, so the map can't pan and no tool reacts while this is open
function ScreenshotTool({ mapTitle, showTopo, onClose }: { mapTitle: string; showTopo: boolean; onClose: () => void }) {
  const map = useMap()
  const [dragging, setDragging] = useState<{ startX: number; startY: number; x: number; y: number } | null>(null)
  const [box, setBox] = useState<Box | null>(null)
  const [background, setBackground] = useState<Background>(showTopo ? 'topo' : 'street')
  const [preview, setPreview] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [tilesMissing, setTilesMissing] = useState(false)

  // the background to go back to when closing
  const showTopoRef = useRef(showTopo)
  useEffect(() => {
    showTopoRef.current = showTopo
  }, [showTopo])

  useEffect(() => {
    if (!map) return
    addSatelliteLayer(map)
    return () => {
      removeSatelliteLayer(map)
      setTopoVisible(map, showTopoRef.current)
    }
  }, [map])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // show the chosen background, wait for its tiles, then take the picture
  useEffect(() => {
    if (!map || !box) return
    setSatelliteVisible(map, background === 'satellite')
    setTopoVisible(map, background === 'topo')

    let cancelled = false
    const capture = async () => {
      const picture = await captureArea(map, box, CREDITS[background])
      if (cancelled) return
      setPreview(picture.toDataURL('image/png'))
      setCapturing(false)
    }
    const onIdle = () => {
      clearTimeout(timer)
      void capture()
    }
    // tiles that never arrive mustn't block the picture: take it anyway, and say so
    const timer = setTimeout(() => {
      map.off('idle', onIdle)
      setTilesMissing(true)
      void capture()
    }, TILES_TIMEOUT_MS)
    map.once('idle', onIdle)
    map.triggerRepaint()

    return () => {
      cancelled = true
      clearTimeout(timer)
      map.off('idle', onIdle)
    }
  }, [map, box, background])

  const pointIn = (e: ReactPointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  const handlePointerDown = (e: ReactPointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const { x, y } = pointIn(e)
    setDragging({ startX: x, startY: y, x, y })
  }
  const handlePointerMove = (e: ReactPointerEvent) => {
    if (!dragging) return
    const rect = e.currentTarget.getBoundingClientRect()
    const { x, y } = pointIn(e)
    // the picture can't reach past the map's edges
    setDragging({ ...dragging, x: Math.min(Math.max(x, 0), rect.width), y: Math.min(Math.max(y, 0), rect.height) })
  }
  const dragBox: Box | null = dragging && {
    x: Math.min(dragging.startX, dragging.x),
    y: Math.min(dragging.startY, dragging.y),
    width: Math.abs(dragging.x - dragging.startX),
    height: Math.abs(dragging.y - dragging.startY),
  }
  const handlePointerUp = () => {
    if (dragBox && dragBox.width >= MIN_BOX_PX && dragBox.height >= MIN_BOX_PX) {
      setBox(dragBox)
      setCapturing(true)
    }
    setDragging(null)
  }

  const chooseBackground = (next: Background) => {
    if (next === background) return
    setBackground(next)
    setCapturing(true)
    setTilesMissing(false)
  }

  const fileName = () => {
    const title = mapTitle.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'map'
    return `${title}-${new Date().toISOString().slice(0, 10)}.png`
  }

  if (!map) return null
  const shownBox = box ?? dragBox

  return (
    <>
      {createPortal(
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => setDragging(null)}
          onContextMenu={(e) => e.preventDefault()}
          className="absolute inset-0 z-[5] cursor-crosshair touch-none select-none"
        >
          {shownBox && (
            <div
              className="absolute border-2 border-dashed border-accent-400 bg-accent-400/10"
              style={{ left: shownBox.x, top: shownBox.y, width: shownBox.width, height: shownBox.height }}
            />
          )}
        </div>,
        map.getContainer(),
      )}

      {!box && (
        // top center over the map area (the property panel takes the right 24rem); phones: across the screen
        <div className="pointer-events-none fixed top-16 left-[calc((100%-24rem)/2)] max-md:inset-x-2 max-md:translate-x-0 z-40 flex -translate-x-1/2 items-center gap-3 bg-neutral-900 px-4 py-2 text-sm text-gray-300 shadow-xl ring-1 ring-white/10">
          <span className="font-semibold text-white">Screenshot</span>
          <span className="text-gray-400">Drag over the area to capture<span className="max-md:hidden"> (Esc cancels)</span></span>
        </div>
      )}

      {box && (
        <div className={formOverlayClass}>
          <div className={`${formClass} md:w-[36rem]`}>
            <h2 className={formTitleClass}>Screenshot</h2>
            <div className="flex gap-2">
              {BACKGROUNDS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={background === id}
                  onClick={() => chooseBackground(id)}
                  className={background === id ? formPrimaryButtonClass : formSecondaryButtonClass}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative flex min-h-40 items-center justify-center bg-neutral-950 ring-1 ring-white/10">
              {preview && <img src={preview} alt="Preview of the selected area" className={`max-h-[50dvh] max-w-full object-contain ${capturing ? 'opacity-40' : ''}`} />}
              {capturing && <span className="absolute text-sm text-gray-300">Loading map...</span>}
            </div>
            {tilesMissing && <p className="text-sm text-amber-400">Some tiles didn't load, so parts of the picture may be missing.</p>}
            <div className="flex gap-2">
              {preview && !capturing ? (
                <a href={preview} download={fileName()} className={`${formPrimaryButtonClass} text-center`}>Download</a>
              ) : (
                <button type="button" disabled className={formPrimaryButtonClass}>Download</button>
              )}
              <button type="button" onClick={onClose} className={formSecondaryButtonClass}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ScreenshotTool
