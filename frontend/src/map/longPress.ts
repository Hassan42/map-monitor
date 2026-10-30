import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

// Touch screens have no right-click: holding a finger still for LONG_PRESS_MS counts as one.
// Android fires a contextmenu on a long press by itself, iOS doesn't - so this does it for both
// (and stands down if the browser's own contextmenu came first)
const LONG_PRESS_MS = 500
const MOVE_TOLERANCE_PX = 10 // a finger that moves further is dragging, not holding

// the map: a long press sends a contextmenu event to the canvas, so MapLibre turns it into its usual
// 'contextmenu' map event (with the features under it) - the existing right-click menus just work
export function addLongPress(canvas: HTMLElement): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  let start: { x: number; y: number } | null = null

  const cancel = () => {
    clearTimeout(timer)
    start = null
  }
  const onTouchStart = (e: TouchEvent) => {
    cancel()
    if (e.touches.length !== 1) return // two fingers: pinch zoom, leave it to the map
    const touch = e.touches[0]
    start = { x: touch.clientX, y: touch.clientY }
    timer = setTimeout(() => {
      if (!start) return
      const { x, y } = start
      start = null
      canvas.dispatchEvent(new MouseEvent('contextmenu', { clientX: x, clientY: y, bubbles: true, cancelable: true }))
      // the finger lifting after a long press must not also count as a tap (which closes the menu)
      canvas.addEventListener('touchend', (end) => end.preventDefault(), { once: true })
    }, LONG_PRESS_MS)
  }
  const onTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0]
    if (start && touch && Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > MOVE_TOLERANCE_PX) cancel()
  }
  // the browser's own long-press menu event (Android) got there first: don't send a second one
  const onNativeContextMenu = (e: MouseEvent) => {
    if (e.isTrusted) cancel()
  }

  canvas.addEventListener('touchstart', onTouchStart, { passive: true })
  canvas.addEventListener('touchmove', onTouchMove, { passive: true })
  canvas.addEventListener('touchend', cancel)
  canvas.addEventListener('touchcancel', cancel)
  canvas.addEventListener('contextmenu', onNativeContextMenu)
  return () => {
    cancel()
    canvas.removeEventListener('touchstart', onTouchStart)
    canvas.removeEventListener('touchmove', onTouchMove)
    canvas.removeEventListener('touchend', cancel)
    canvas.removeEventListener('touchcancel', cancel)
    canvas.removeEventListener('contextmenu', onNativeContextMenu)
  }
}

// a list row or button: pointer handlers that call onLongPress(x, y) after a held touch. Mouse and
// pen are left alone - they have a real right-click (onContextMenu)
export function useLongPress(onLongPress: (x: number, y: number) => void) {
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null)
  const cancel = () => {
    if (press.current) clearTimeout(press.current.timer)
    press.current = null
  }
  return {
    onPointerDown: (e: ReactPointerEvent) => {
      cancel()
      if (e.pointerType !== 'touch') return
      const { clientX: x, clientY: y } = e
      press.current = {
        x,
        y,
        timer: setTimeout(() => {
          press.current = null
          onLongPress(x, y)
        }, LONG_PRESS_MS),
      }
    },
    onPointerMove: (e: ReactPointerEvent) => {
      const p = press.current
      if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > MOVE_TOLERANCE_PX) cancel()
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
  }
}
