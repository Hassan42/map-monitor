import { useEffect, useState } from 'react'
import { useMap } from '../store/MapContext'
import { cameraPadding } from '../map/cameraPadding'
import { searchPlaces } from '../map/placeFinder'
import type { Place } from '../map/placeFinder'
import { formInputClass } from '../styles/formStyles'
import { navButtonActiveClass, navButtonClass } from '../styles/navStyles'
import NavIcon from './NavIcon'
import searchIcon from '../assets/icons/search.svg'

function PlaceSearch() {
  const map = useMap() // from store/MapContext, like the other map components
  const [text, setText] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false) // the box shows only after the search icon is pressed

  const close = () => {
    setExpanded(false)
    setOpen(false)
  }

  useEffect(() => {
    if (text.trim().length < 2) return setResults([])
    const controller = new AbortController()
    const timer = setTimeout(() => {
      searchPlaces(text, controller.signal).then(setResults).catch(() => {})
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [text])

  const goTo = (place: Place) => {
    if (place.bounds) map?.fitBounds(place.bounds, { padding: cameraPadding(), maxZoom: 14 })
    else map?.flyTo({ center: place.center, zoom: 12, padding: cameraPadding() })
    setText(place.name)
    close()
  }

  if (!expanded) {
    return (
      <button type="button" aria-label="Search places" title="Search places" onClick={() => setExpanded(true)} className={navButtonClass}>
        <NavIcon src={searchIcon} />
      </button>
    )
  }

  // phones: the box covers the whole bar while open. Wider screens: it opens in place
  return (
    <div className="flex items-center gap-1 max-md:fixed max-md:inset-x-0 max-md:top-0 max-md:z-[60] max-md:h-14 max-md:bg-neutral-900 max-md:px-2 md:relative">
      <input
        autoFocus
        value={text}
        onChange={(e) => { setText(e.target.value); setOpen(true) }}
        onKeyDown={(e) => e.key === 'Escape' && close()}
        placeholder="Search places"
        className={`${formInputClass} max-md:flex-1 md:w-56`}
      />
      {/* the same search icon, lit while open: pressing it again closes the box */}
      <button type="button" aria-label="Close search" title="Close search" onClick={close} className={`${navButtonClass} ${navButtonActiveClass}`}>
        <NavIcon src={searchIcon} />
      </button>
      {open && results.length > 0 && (
        <ul className="absolute top-full mt-1 bg-neutral-900 ring-1 ring-white/10 max-md:inset-x-0 md:w-72">
          {results.map((place, i) => (
            <li key={i}>
              <button type="button" onClick={() => goTo(place)} className="w-full px-3 py-1.5 text-left hover:bg-neutral-800">
                {place.name} <span className="text-xs text-gray-500">{place.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default PlaceSearch