import type { EventCategory } from '../types/types'
import { EVENT_CATEGORIES, EVENT_CATEGORY_LIST } from './eventCategories'

// a map marker: a faction-colored circle with the category's icon

const OUTLINE_COLOR = '#111111'
// sizes in image pixels; images are shown at half that (pixelRatio 2) so they stay sharp
const MARKER_PX = 98
const ICON_PX = 62
const OUTLINE_PX = 4

// loaded category icons; categories without an icon (OTHER) are simply absent
export type CategoryIcons = Partial<Record<EventCategory, HTMLImageElement>>

async function loadImage(url: string) {
  const img = new Image()
  img.src = url
  await img.decode()
  return img
}

// every category's icon, loaded once
export async function loadCategoryIcons(): Promise<CategoryIcons> {
  const loaded = await Promise.all(
    EVENT_CATEGORY_LIST.map(async (category) => {
      const url = EVENT_CATEGORIES[category].icon
      return [category, url ? await loadImage(url) : null] as const
    }),
  )
  return Object.fromEntries(loaded.filter(([, img]) => img)) as CategoryIcons
}

// one marker as a single image: circle in the faction color, dark outline, white category icon.
// drawing it as one image (instead of a circle layer + an icon layer) means an event on top
// covers the whole event below it, icon included
export function drawMarkerImage(icon: HTMLImageElement | undefined, color: string) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = MARKER_PX
  const ctx = canvas.getContext('2d')!

  ctx.beginPath()
  ctx.arc(MARKER_PX / 2, MARKER_PX / 2, MARKER_PX / 2 - OUTLINE_PX / 2, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.lineWidth = OUTLINE_PX
  ctx.strokeStyle = OUTLINE_COLOR
  ctx.stroke()

  if (icon) {
    // fit inside an ICON_PX square keeping the icon's proportions (e.g. the flag is taller than wide)
    const scale = Math.min(ICON_PX / icon.naturalWidth, ICON_PX / icon.naturalHeight)
    const w = icon.naturalWidth * scale
    const h = icon.naturalHeight * scale

    // the icons are single-color (black): recolor white on their own canvas, then stamp in the middle
    const iconCanvas = document.createElement('canvas')
    iconCanvas.width = iconCanvas.height = ICON_PX
    const iconCtx = iconCanvas.getContext('2d')!
    iconCtx.drawImage(icon, (ICON_PX - w) / 2, (ICON_PX - h) / 2, w, h)
    iconCtx.globalCompositeOperation = 'source-in' // keep the icon's shape, replace its color
    iconCtx.fillStyle = '#fff'
    iconCtx.fillRect(0, 0, ICON_PX, ICON_PX)
    ctx.drawImage(iconCanvas, (MARKER_PX - ICON_PX) / 2, (MARKER_PX - ICON_PX) / 2)
  }

  return ctx.getImageData(0, 0, MARKER_PX, MARKER_PX)
}

// events drawn by the map itself (GeoJSON source + layers) instead of one HTML Marker each:
// a circle in the faction color with the category's icon on top, clustered when zoomed out
