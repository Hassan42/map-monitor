import { useEffect, useRef, useState, type ReactNode } from 'react'
import { navButtonActiveClass, navButtonClass } from '../styles/navStyles'

type Props = {
    label: ReactNode // text or an icon
    ariaLabel?: string // needed when the label is only an icon
    title?: string
    active?: boolean // one of its items is in use: the button shows pressed, like a toggle
    align?: 'left' | 'right' // which edge the menu lines up with; 'right' near the screen's right edge
    children: ReactNode
}

function NavDropdown({ label, ariaLabel, title, active = false, align = 'left', children }: Props) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    // close when clicking outside the dropdown or pressing Escape
    useEffect(() => {
        if (!open) return
        const handlePointerDown = (e: PointerEvent) => {
            if (!ref.current?.contains(e.target as Node)) setOpen(false)
        }
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false)
        }
        document.addEventListener('pointerdown', handlePointerDown)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [open])

    return (
        <div ref={ref} className="relative shrink-0">
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={ariaLabel}
                title={title}
                onClick={() => setOpen((o) => !o)}
                className={`${navButtonClass} flex items-center gap-1 ${open || active ? navButtonActiveClass : ''}`}
            >
                {label} <span aria-hidden="true" className="text-xs">▾</span>
            </button>

            {open && (
                // clicking any item closes the menu
                <div
                    role="menu"
                    onClick={() => setOpen(false)}
                    className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1 min-w-40 py-1 bg-neutral-800 shadow-lg ring-1 ring-black/40`}
                >
                    {children}
                </div>
            )}
        </div>
    )
}

// active: a toggle that's on (e.g. a map layer), shown in the accent color
export function NavDropdownItem({ onClick, active, children }: { onClick?: () => void; active?: boolean; children: ReactNode }) {
    return (
        <button
            type="button"
            role="menuitem"
            aria-pressed={active}
            onClick={onClick}
            className={`flex w-full items-center gap-3 text-left px-4 py-2.5 whitespace-nowrap transition-colors hover:bg-accent-400/15 hover:text-accent-300 ${active ? 'text-accent-300' : ''}`}
        >
            {children}
        </button>
    )
}

export default NavDropdown