import { useEffect, useRef, useState } from 'react'
import NavIcon from './NavIcon'
import ConfirmDialog from './ConfirmDialog'
import closeIcon from '../assets/icons/close.svg'
import chevronIcon from '../assets/icons/chevron-down.svg'
import publishIcon from '../assets/icons/publish.svg'
import { getDraftChanges } from '../api/map'
import { navButtonActiveClass, navButtonClass } from '../styles/navStyles'
import { formPrimaryButtonClass } from '../styles/formStyles'
import type { MapChange, MapChangeAction } from '../types/types'

// the nav bar's Publish button: it doesn't publish right away but opens a menu of the draft's changes
// for a last look - each one discardable (the element goes back to how it's published) - with the actual
// Publish button at the bottom. Locked while the draft has nothing to publish

const ENTITY_LABEL: Record<MapChange['entityType'], string> = { TERRITORY: 'Territory', EVENT: 'Event', ANNOTATION: 'Annotation', LAYER: 'Layer' }

const ACTION_LABEL: Record<MapChangeAction, string> = { ADDED: 'Added', MODIFIED: 'Modified', DELETED: 'Deleted' }

const ACTION_CLASS: Record<MapChangeAction, string> = {
    ADDED: 'bg-green-500/20 text-green-300',
    MODIFIED: 'bg-amber-500/20 text-amber-300',
    DELETED: 'bg-red-500/20 text-red-300',
}

// what discarding does, by what the draft did
const DISCARD_MESSAGE: Record<MapChangeAction, string> = {
    ADDED: 'The element was added in this draft, so it will be removed from the map.',
    MODIFIED: "Every edit this draft made to the element is undone: it goes back to how it's published.",
    DELETED: "The element comes back, as it's published.",
}

function PublishMenu({
    mapId,
    revision,
    hasChanges,
    onDiscard,
    onPublish,
}: {
    mapId: string
    revision: number // bumped after every edit: the open menu reloads
    hasChanges: boolean // the draft has something to publish (from the draft status)
    onDiscard: (change: MapChange) => void // after the user confirmed
    onPublish: () => void
}) {
    const [open, setOpen] = useState(false)
    const [changes, setChanges] = useState<MapChange[]>([])
    // the revision `changes` was loaded for: while it's behind, the list is still loading
    const [loadedRevision, setLoadedRevision] = useState<number | null>(null)
    const [discarding, setDiscarding] = useState<MapChange | null>(null)
    const ref = useRef<HTMLDivElement>(null)

    // loaded when the menu opens, and again after every edit while it's open
    useEffect(() => {
        if (!open) return
        let cancelled = false
        getDraftChanges(mapId)
            .then((list) => !cancelled && setChanges(list))
            .catch(() => { })
            .finally(() => !cancelled && setLoadedRevision(revision))
        return () => {
            cancelled = true
        }
    }, [open, mapId, revision])

    // close when clicking outside the menu or pressing Escape (like NavDropdown)
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

    const loading = loadedRevision !== revision

    return (
        <div ref={ref} className="relative shrink-0">
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="Publish"
                title={hasChanges ? 'Publish - review the draft changes first' : 'Nothing to publish'}
                disabled={!hasChanges}
                onClick={() => setOpen((o) => !o)}
                className={`${navButtonClass} flex items-center gap-1 disabled:cursor-not-allowed disabled:text-gray-600 disabled:hover:bg-transparent ${open ? navButtonActiveClass : ''}`}
            >
                <NavIcon src={publishIcon} />
                {/* turns over while the menu is open */}
                <NavIcon src={chevronIcon} className={`!h-4 !w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                {/* heartbeat square: there are draft changes waiting to be published */}
                {hasChanges && (
                    <span title="Unpublished changes" className="ml-1 h-2.5 w-2.5 bg-accent-400 animate-heartbeat motion-reduce:animate-none" />
                )}
            </button>

            {open && (
                <div role="menu" // phones: across the screen under the nav bar, since centered under the button it would run off the edge
                    className="absolute left-1/2 top-full mt-3 w-[28rem] -translate-x-1/2 max-w-[calc(100vw-2rem)] max-md:fixed max-md:inset-x-2 max-md:top-14 max-md:w-auto max-md:max-w-none max-md:translate-x-0 bg-neutral-800 py-1 text-sm shadow-lg ring-1 ring-black/40">
                    <p className="px-3 pt-1 pb-2 text-xs uppercase text-gray-400">Draft changes</p>
                    {loading && changes.length === 0 && <p className="px-3 pb-2 text-gray-400">Loading…</p>}
                    {!loading && changes.length === 0 && <p className="px-3 pb-2 text-gray-400">Nothing to publish</p>}
                    <ul className="max-h-96 overflow-y-auto">
                        {changes.map((c) => (
                            <li key={`${c.entityType}-${c.stableId}`} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5">
                                <span className={`w-16 shrink-0 px-1.5 text-center text-xs ${ACTION_CLASS[c.action]}`}>{ACTION_LABEL[c.action]}</span>
                                <span title={c.name ?? undefined} className="flex-1 truncate">{c.name || <span className="text-gray-400 italic">Unnamed</span>}</span>
                                <span className="text-xs text-gray-400">{ENTITY_LABEL[c.entityType]}</span>
                                <button
                                    type="button"
                                    aria-label="Discard this change"
                                    title="Discard this change"
                                    onClick={() => setDiscarding(c)}
                                    className="p-0.5 text-gray-400 hover:text-red-300"
                                >
                                    <NavIcon src={closeIcon} />
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div className="flex border-t border-black/40 px-3 pt-2 pb-1 mt-1">
                        <button
                            type="button"
                            disabled={loading || changes.length === 0}
                            onClick={() => {
                                setOpen(false)
                                onPublish()
                            }}
                            className={formPrimaryButtonClass}
                        >
                            Publish {changes.length} {changes.length === 1 ? 'change' : 'changes'}
                        </button>
                    </div>
                </div>
            )}

            {discarding && (
                <ConfirmDialog
                    title={`Discard this change${discarding.name ? ` to "${discarding.name}"` : ''}?`}
                    message={DISCARD_MESSAGE[discarding.action]}
                    confirmLabel="Discard"
                    onConfirm={() => {
                        onDiscard(discarding)
                        setDiscarding(null)
                    }}
                    onCancel={() => setDiscarding(null)}
                />
            )}
        </div>
    )
}

export default PublishMenu
