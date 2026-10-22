import { useEffect, useRef, useState, type ReactNode } from 'react'
import { navButtonClass } from '../styles/navStyles'

type Props = {
    label: string
    children: ReactNode
}

function NavDropdown({ label, children }: Props) {
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
        <div ref={ref} className="relative">
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                className={`${navButtonClass} ${open ? 'bg-accent-400/15 text-accent-300' : ''}`}
            >
                {label} ▾
            </button>

            {open && (
                // clicking any item closes the menu
                <div
                    role="menu"
                    onClick={() => setOpen(false)}
                    className="absolute left-0 top-full mt-1 min-w-40 py-1 bg-neutral-800 shadow-lg ring-1 ring-black/40"
                >
                    {children}
                </div>
            )}
        </div>
    )
}

export function NavDropdownItem({ onClick, children }: { onClick?: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            role="menuitem"
            onClick={onClick}
            className="block w-full text-left px-4 py-2 transition-colors hover:bg-accent-400/15 hover:text-accent-300"
        >
            {children}
        </button>
    )
}

export default NavDropdown