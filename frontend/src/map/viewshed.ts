// Viewshed: which places around an observer can be seen, given the terrain in between.
// Runs in a Web Worker (viewshed.worker.ts); everything here is plain functions, no React / MapLibre.
//
// 1. fetch the elevation tiles around the observer (Mapterhorn, "terrarium" encoding)
// 2. cast rays outward in every direction; along each ray a point is visible if the angle from the
//    observer's eye to it is at least as steep as everything before it (else a ridge blocks it)
// 3. paint a mask image: transparent where visible, gray where hidden or outside the range

const ELEVATION_TILE_URL = 'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'
const TILE_SIZE = 512
const MAX_TILE_ZOOM = 14

const EARTH_RADIUS = 6378137 // meters (Web Mercator)
const REFRACTION = 0.13 // light bends slightly over the horizon: the usual correction factor

// elevation pixels across the circle: enough detail, and only a handful of tiles at any range
const TARGET_PIXELS_ACROSS = 600
const MAX_RAYS = 4096

// gray for hidden / out-of-range areas (RGBA); the outer map mask in Viewshed.tsx uses the same
export const MASK_COLOR: [number, number, number, number] = [23, 23, 23, 170]

export interface ViewshedRequest {
  lng: number
  lat: number
  range: number // meters
  observerHeight: number // meters above the ground at the observer
}

export interface ViewshedResult {
  width: number
  height: number
  pixels: Uint8ClampedArray // RGBA mask, width * height * 4
  // lng/lat of the mask's corners: top-left, top-right, bottom-right, bottom-left
  corners: [[number, number], [number, number], [number, number], [number, number]]
  groundHeight: number // terrain height at the observer, meters
  resolution: number // meters per mask pixel
}

// ---- Web Mercator pixel coordinates at a zoom (512px tiles) ----

const worldSize = (zoom: number) => TILE_SIZE * 2 ** zoom

function toPixel(lng: number, lat: number, zoom: number): [number, number] {
  const phi = (lat * Math.PI) / 180
  const size = worldSize(zoom)
  return [((lng + 180) / 360) * size, ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * size]
}

function toLngLat(x: number, y: number, zoom: number): [number, number] {
  const size = worldSize(zoom)
  const lng = (x / size) * 360 - 180
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / size))) * 180) / Math.PI
  return [lng, lat]
}

const metersPerPixel = (lat: number, zoom: number) =>
  (2 * Math.PI * EARTH_RADIUS * Math.cos((lat * Math.PI) / 180)) / worldSize(zoom)

// ---- elevation tiles ----

// decoded tiles, kept for repeated viewsheds in the same area (each is 1 MB, so not too many)
const tileCache = new Map<string, Promise<Float32Array | null>>()
const MAX_CACHED_TILES = 48

// heights in meters for one tile, or null where there's no tile (open sea)
function loadTile(zoom: number, x: number, y: number): Promise<Float32Array | null> {
  const key = `${zoom}/${x}/${y}`
  const cached = tileCache.get(key)
  if (cached) return cached

  const promise = (async () => {
    const response = await fetch(ELEVATION_TILE_URL.replace('{z}', String(zoom)).replace('{x}', String(x)).replace('{y}', String(y)))
    if (!response.ok) return null
    // no color management / premultiplying: the colors are encoded heights, they must stay exact
    const bitmap = await createImageBitmap(await response.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const context = canvas.getContext('2d')!
    context.drawImage(bitmap, 0, 0)
    const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height)

    // terrarium: height = (red * 256 + green + blue / 256) - 32768
    const heights = new Float32Array(bitmap.width * bitmap.height)
    for (let i = 0; i < heights.length; i++) {
      heights[i] = data[i * 4] * 256 + data[i * 4 + 1] + data[i * 4 + 2] / 256 - 32768
    }
    return heights
  })()

  tileCache.set(key, promise)
  if (tileCache.size > MAX_CACHED_TILES) tileCache.delete(tileCache.keys().next().value!)
  return promise
}

// heights for a pixel rectangle at `zoom`, stitched from the tiles it overlaps (missing tiles = sea level)
async function loadHeightGrid(zoom: number, x0: number, y0: number, width: number, height: number) {
  const grid = new Float32Array(width * height)
  const tilesPerSide = 2 ** zoom
  const jobs: Promise<void>[] = []

  for (let ty = Math.floor(y0 / TILE_SIZE); ty <= Math.floor((y0 + height - 1) / TILE_SIZE); ty++) {
    if (ty < 0 || ty >= tilesPerSide) continue
    for (let tx = Math.floor(x0 / TILE_SIZE); tx <= Math.floor((x0 + width - 1) / TILE_SIZE); tx++) {
      const wrappedX = ((tx % tilesPerSide) + tilesPerSide) % tilesPerSide // across the antimeridian
      jobs.push(
        loadTile(zoom, wrappedX, ty).then((tile) => {
          if (!tile) return
          // copy the part of this tile that falls inside the grid
          const fromX = Math.max(x0, tx * TILE_SIZE)
          const toX = Math.min(x0 + width, (tx + 1) * TILE_SIZE)
          const fromY = Math.max(y0, ty * TILE_SIZE)
          const toY = Math.min(y0 + height, (ty + 1) * TILE_SIZE)
          for (let gy = fromY; gy < toY; gy++) {
            for (let gx = fromX; gx < toX; gx++) {
              grid[(gy - y0) * width + (gx - x0)] = tile[(gy - ty * TILE_SIZE) * TILE_SIZE + (gx - tx * TILE_SIZE)]
            }
          }
        }),
      )
    }
  }
  await Promise.all(jobs)
  return grid
}

// ---- the viewshed ----

export async function computeViewshed({ lng, lat, range, observerHeight }: ViewshedRequest): Promise<ViewshedResult> {
  // zoom whose pixels give about TARGET_PIXELS_ACROSS across the circle (never finer than needed)
  const targetResolution = (2 * range) / TARGET_PIXELS_ACROSS
  const zoom = Math.max(0, Math.min(MAX_TILE_ZOOM, Math.floor(Math.log2(metersPerPixel(lat, 0) / targetResolution))))
  const resolution = metersPerPixel(lat, zoom)
  const radius = range / resolution // in pixels

  // the grid: a square around the circle, in global pixel coordinates at `zoom`
  const [centerX, centerY] = toPixel(lng, lat, zoom)
  const x0 = Math.floor(centerX - radius) - 1
  const y0 = Math.floor(centerY - radius) - 1
  const width = Math.ceil(centerX + radius) + 2 - x0
  const height = Math.ceil(centerY + radius) + 2 - y0
  const grid = await loadHeightGrid(zoom, x0, y0, width, height)

  // observer, relative to the grid
  const ox = centerX - x0
  const oy = centerY - y0

  // bilinear height at a grid position; NaN outside the grid
  const heightAt = (x: number, y: number) => {
    const ix = Math.floor(x - 0.5)
    const iy = Math.floor(y - 0.5)
    if (ix < 0 || iy < 0 || ix + 1 >= width || iy + 1 >= height) return NaN
    const fx = x - 0.5 - ix
    const fy = y - 0.5 - iy
    const i = iy * width + ix
    const top = grid[i] * (1 - fx) + grid[i + 1] * fx
    const bottom = grid[i + width] * (1 - fx) + grid[i + width + 1] * fx
    return top * (1 - fy) + bottom * fy
  }

  const groundHeight = heightAt(ox, oy) || 0
  const eye = groundHeight + observerHeight

  // rays: enough that neighbouring rays are about a pixel apart at the edge of the circle
  const steps = Math.ceil(radius)
  const rays = Math.min(MAX_RAYS, Math.max(360, Math.ceil(2 * Math.PI * radius)))
  const visible = new Uint8Array(rays * (steps + 1))

  for (let ray = 0; ray < rays; ray++) {
    const bearing = (ray / rays) * 2 * Math.PI // 0 = north, clockwise
    const dx = Math.sin(bearing)
    const dy = -Math.cos(bearing) // pixel y grows southward
    visible[ray * (steps + 1)] = 1 // the observer's own spot
    let steepest = -Infinity

    for (let step = 1; step <= steps; step++) {
      const ground = heightAt(ox + dx * step, oy + dy * step)
      if (Number.isNaN(ground)) break
      const distance = step * resolution
      // the earth curves away: far points sit lower than the flat-map height suggests
      const drop = ((distance * distance) / (2 * EARTH_RADIUS)) * (1 - REFRACTION)
      const slope = (ground - drop - eye) / distance
      if (slope >= steepest) {
        visible[ray * (steps + 1) + step] = 1
        steepest = slope
      }
    }
  }

  // the mask: each pixel looks up the nearest ray sample by its direction and distance from the observer
  const pixels = new Uint8ClampedArray(width * height * 4)
  const [r, g, b, a] = MASK_COLOR
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x + 0.5 - ox
      const py = y + 0.5 - oy
      const distance = Math.hypot(px, py)
      let seen = false
      if (distance <= radius) {
        const bearing = (Math.atan2(px, -py) + 2 * Math.PI) % (2 * Math.PI)
        const ray = Math.round((bearing / (2 * Math.PI)) * rays) % rays
        seen = visible[ray * (steps + 1) + Math.min(steps, Math.round(distance))] === 1
      }
      if (!seen) {
        const i = (y * width + x) * 4
        pixels[i] = r
        pixels[i + 1] = g
        pixels[i + 2] = b
        pixels[i + 3] = a
      }
    }
  }

  return {
    width,
    height,
    pixels,
    corners: [
      toLngLat(x0, y0, zoom),
      toLngLat(x0 + width, y0, zoom),
      toLngLat(x0 + width, y0 + height, zoom),
      toLngLat(x0, y0 + height, zoom),
    ],
    groundHeight,
    resolution,
  }
}
