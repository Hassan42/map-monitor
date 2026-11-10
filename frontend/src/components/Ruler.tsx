import { useEffect } from 'react'
import { useTerraDraw } from '../store/TerraDrawContext'
import { RULER_MODE } from '../map/territoryDraw'

// the ruler: while it's on, the shared terra-draw draws lines in RULER_MODE (TerritoryLayer switches the
// mode) and the measure control labels their distances. This is only the hint bar around it
function Ruler({ measuring, onClose }: { measuring: boolean; onClose: () => void }) {
  const draw = useTerraDraw()

  // Esc closes; turning the ruler off removes its lines, so nothing is left behind
  useEffect(() => {
    if (!measuring) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearRulerLines()
    }
    // clearRulerLines only reads `draw`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measuring, draw, onClose])

  function clearRulerLines() {
    const terraDraw = draw?.getTerraDrawInstance()
    if (!terraDraw) return
    terraDraw.removeFeatures(terraDraw.getSnapshot().filter((f) => f.properties.mode === RULER_MODE).map((f) => f.id!))
  }

  if (!measuring) return null

  return (
    // top center over the map area (the property panel takes the right 24rem); phones: across the screen
    <div className="fixed top-20 left-[calc((100%-24rem)/2)] max-md:inset-x-2 max-md:translate-x-0 max-md:flex-wrap z-40 flex -translate-x-1/2 items-center gap-3 bg-neutral-900 px-4 py-2 text-sm text-gray-300 shadow-xl ring-1 ring-white/10">
      <span className="font-semibold text-white">Ruler</span>
      <span className="text-gray-400">
        <span className="md:hidden">Tap to add points, tap the last one to finish</span>
        <span className="max-md:hidden">Click to add points, double-click to finish (Esc closes)</span>
      </span>
      <button type="button" onClick={clearRulerLines} className="px-2 py-1 transition-colors hover:bg-accent-400/15 hover:text-accent-300">
        Clear
      </button>
    </div>
  )
}

export default Ruler
