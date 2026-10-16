import type { ExpressionSpecification } from 'maplibre-gl'

// Annotations are sized relative to the map, not the screen: like the map itself, they double in
// size with every zoom level. `scale` is the size at this reference zoom: 1 = the icon's normal
// 32px at zoom 10, 2 = 64px there, and so on.
export const ANNOTATION_REFERENCE_ZOOM = 10

// MapLibre stores a symbol's size as 128 * size, capped at 32640: icon-size can't go above 255
export const MAX_ICON_SIZE = 255
// never below ~10px on screen, so annotations stay visible when zoomed far out
export const ICON_MIN_SIZE = 0.3
// icons are 32px on screen at icon-size 1, i.e. 16px radius per unit of size
export const ICON_RADIUS_PX = 16

// how big (icon-size) an annotation is drawn at `zoom` - the same curve as zoomScaled() below,
// ignoring the gentler interpolation below zoom 8
export function displayedIconSize(scale: number, zoom: number) {
  return Math.min(Math.max(scale * 2 ** (zoom - ANNOTATION_REFERENCE_ZOOM), ICON_MIN_SIZE), MAX_ICON_SIZE)
}

// the scale that makes an annotation its normal size (32px) at `zoom` - used when creating one,
// so it appears at a normal size where you are, and then scales with the map
export function scaleAtZoom(zoom: number) {
  return 2 ** (ANNOTATION_REFERENCE_ZOOM - zoom)
}

// layer expression: `value` (e.g. based on ['get', 'scale']) at the reference zoom, doubling per zoom
// level like the map itself, but never below `min` so annotations stay visible when zoomed far out.
//
// MapLibre computes a zoom + data size per tile, only between the two stops around the tile's zoom,
// and stores the sizes at those stops (icon sizes capped at MAX_ICON_SIZE). So:
// - stops are few and 8 zoom levels apart: with one stop per level, each tile stopped resizing after
//   one level and icons visibly "caught up" when zooming fast
// - stop values are kept within the cap: a capped stop bends the whole range between its two stops
// Between 8 and 16, exponential base-2 interpolation is exactly value * 2^(zoom - 10) (for scales up to
// ~4; above that the zoom-16 stop hits the cap). The minimum applies at 0 and 8; MapLibre only
// allows ['zoom'] at the top of an interpolate, so it can't wrap the whole expression
export function zoomScaled(value: ExpressionSpecification, min: number, max: number = MAX_ICON_SIZE): ExpressionSpecification {
  const at = (zoom: number): ExpressionSpecification => ['*', value, 2 ** (zoom - ANNOTATION_REFERENCE_ZOOM)]
  return [
    'interpolate', ['exponential', 2], ['zoom'],
    0, ['max', at(0), min],
    8, ['max', at(8), min],
    16, ['min', at(16), max],
    24, ['min', at(24), max],
  ]
}
