import type { PaddingOptions } from 'maplibre-gl'
import { isPhone } from '../hooks/useIsPhone'

// keep jumped-to and fitted areas clear of what covers the map: the nav bar (h-14 = 56px) on top, and the
// property panel - on desktop its right column (w-96 = 384px), on phones the sheet's bar plus the
// timeline above it at the bottom. Read on each jump, so it follows the screen size
export function cameraPadding(): PaddingOptions {
  return isPhone()
    ? { top: 56 + 20, right: 20, bottom: 200, left: 20 }
    : { top: 56 + 40, right: 384 + 40, bottom: 40, left: 40 }
}
