import type { IControl, LngLatBounds, Map, PaddingOptions } from 'maplibre-gl'

// keep the fitted area clear of the nav bar (h-14 = 56px) and the property panel (w-72 = 288px)
const PADDING: PaddingOptions = { top: 56 + 40, right: 288 + 40, bottom: 40, left: 40 }
// the view MapContext starts with, used when there's nothing on the map to fit
const START_VIEW = { center: [0, 0] as [number, number], zoom: 2 }

// "fit to screen" corners, drawn square like the rest of the UI. 15px in MapLibre's 29px button
// leaves exactly 7px per side, so the 2px lines land on whole pixels (16px would sit on half pixels
// and render blurry / off-center)
const ICON = `
  <svg viewBox="0 0 15 15" width="15" height="15" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="square" aria-hidden="true">
    <path d="M2 6V2h4M9 2h4v4M13 9v4h-4M6 13H2v-4" />
  </svg>`

// MapLibre control (sits with the zoom buttons): zooms to show every territory and event,
// or back to the start view when the map is empty. getBounds is called on each click,
// so it always uses the latest data
export class ResetViewControl implements IControl {
  private container?: HTMLDivElement
  private readonly getBounds: () => LngLatBounds | null

  constructor(getBounds: () => LngLatBounds | null) {
    this.getBounds = getBounds
  }

  onAdd(map: Map) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'reset-view-button'
    button.title = 'Show everything'
    button.setAttribute('aria-label', 'Show everything')
    button.innerHTML = ICON
    button.addEventListener('click', () => {
      const bounds = this.getBounds()
      if (bounds) map.fitBounds(bounds, { padding: PADDING, maxZoom: 12 })
      else map.flyTo({ ...START_VIEW, bearing: 0, pitch: 0 })
    })

    // the classes MapLibre's own controls use, so it looks and stacks like them
    const container = document.createElement('div')
    container.className = 'maplibregl-ctrl maplibregl-ctrl-group'
    container.append(button)
    this.container = container
    return container
  }

  onRemove() {
    this.container?.remove()
    this.container = undefined
  }
}
