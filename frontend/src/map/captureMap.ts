import type { Map } from 'maplibre-gl'

// an area of the map, in CSS pixels from its top-left corner
export interface Box {
  x: number
  y: number
  width: number
  height: number
}

// the credits every picture must carry: small text on a dark strip, bottom right
function drawCredits(ctx: CanvasRenderingContext2D, credits: string, width: number, height: number, scale: number) {
  const size = 11 * scale
  ctx.font = `${size}px sans-serif`
  const padding = 4 * scale
  const textWidth = Math.min(ctx.measureText(credits).width, width - padding * 2)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
  ctx.fillRect(width - textWidth - padding * 2, height - size - padding * 2, textWidth + padding * 2, size + padding * 2)
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'bottom'
  ctx.fillText(credits, width - textWidth - padding, height - padding, textWidth)
}

// the map's picture, cropped to `box`, with the credits on it. MapLibre clears its canvas after each
// frame, so this copies it right after a render (preserveDrawingBuffer would slow the whole map down)
export function captureArea(map: Map, box: Box, credits: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve) => {
    map.once('render', () => {
      const source = map.getCanvas()
      const scale = source.width / source.clientWidth // retina screens: real pixels per CSS pixel
      const out = document.createElement('canvas')
      out.width = Math.round(box.width * scale)
      out.height = Math.round(box.height * scale)
      const ctx = out.getContext('2d')!
      ctx.drawImage(source, box.x * scale, box.y * scale, out.width, out.height, 0, 0, out.width, out.height)
      drawCredits(ctx, credits, out.width, out.height, scale)
      resolve(out)
    })
    map.triggerRepaint()
  })
}
