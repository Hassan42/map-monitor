import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { EventCategory } from '../types/types'
import { EVENT_CATEGORIES, EVENT_CATEGORY_GROUPS } from '../map/eventCategories'
import { formInputClass, formTitleClass } from '../styles/formStyles'

// the category as it looks on the map: a white icon in a circle. The svgs are black, so `invert`
// makes them white. `size` is the circle's classes (size and color), `iconSize` the icon's
function MarkerIcon({ category, size, iconSize }: { category: EventCategory; size: string; iconSize: string }) {
  const { label, icon } = EVENT_CATEGORIES[category]
  return (
    <span title={label} className={`${size} flex shrink-0 items-center justify-center rounded-full`}>
      {icon && <img src={icon} alt="" aria-hidden className={`${iconSize} invert`} />}
    </span>
  )
}

// the event form's category field: a button showing the current icon + name that opens its own
// window (above the form) with the categories grouped, each as an icon tile
function CategoryPicker({ id, value, onChange }: { id: string; value: EventCategory; onChange: (category: EventCategory) => void }) {
  const [open, setOpen] = useState(false)

  // close on Escape (it stops here so it doesn't also close the form)
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open])

  const pick = (category: EventCategory) => {
    onChange(category)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`${formInputClass} flex w-full items-center gap-2 text-left`}
      >
        <MarkerIcon category={value} size="h-6 w-6 bg-neutral-600" iconSize="h-4 w-4" />
        <span className="flex-1 truncate">{EVENT_CATEGORIES[value].label}</span>
        <span aria-hidden className={`text-xs text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {/* a portal to <body>: its own window above the form (z-[80] over the form's z-[70]), not
          clipped or scrolled by it. A click on the dark backdrop closes it */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60" onClick={() => setOpen(false)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${id}-title`}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[85vh] w-[60rem] max-w-[calc(100vw-2rem)] flex-col gap-4 bg-neutral-900 p-5 text-gray-300 shadow-xl ring-1 ring-white/10"
            >
              <div className="flex items-center justify-between">
                <h2 id={`${id}-title`} className={formTitleClass}>Choose a category</h2>
                <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="px-2 text-xl leading-none text-gray-400 hover:text-white">×</button>
              </div>
              <div role="listbox" aria-labelledby={`${id}-title`} className="flex flex-col gap-2 overflow-y-auto">
                {/* one boxed row per group; the window is wide enough for the biggest group on one line */}
                {EVENT_CATEGORY_GROUPS.map((group) => (
                  <div key={group.label} className="flex flex-col gap-2 bg-white/[0.04] p-3 ring-1 ring-white/10">
                    <h3 className="border-l-2 border-accent-400 pl-2 text-sm font-semibold text-gray-100">{group.label}</h3>
                    <div className="flex flex-wrap gap-1">
                      {group.categories.map((category) => {
                        const selected = category === value
                        return (
                          <button
                            key={category}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => pick(category)}
                            className={`group flex w-20 flex-col items-center gap-1 px-1 py-1.5 text-center text-[11px] leading-tight transition-colors ${
                              selected ? 'bg-accent-400/15 text-accent-200' : 'text-gray-300 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <MarkerIcon
                              category={category}
                              size={`h-10 w-10 ${selected ? 'bg-accent-400/40 ring-2 ring-accent-400' : 'bg-neutral-600 group-hover:bg-neutral-500'}`}
                              iconSize="h-6 w-6"
                            />
                            {EVENT_CATEGORIES[category].label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

export default CategoryPicker
