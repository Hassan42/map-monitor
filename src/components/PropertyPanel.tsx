import { useState, type ReactNode } from 'react'
import type { EventCategory, EventMarker, Faction, MapSummary, Territory } from '../types/types'
import type { LngLatBoundsLike, PaddingOptions } from 'maplibre-gl'
import { useMap, useSelection } from '../store/MapContext'
import { EVENTS_CLUSTER_MAX_ZOOM } from '../map/mapLayers'
import { EVENT_CATEGORIES, categoryOf } from '../map/eventCategories'

type Tab = 'factions' | 'elements'

// keep jumped-to elements clear of the nav bar (h-14 = 56px) and this panel (w-72 = 288px)
const CAMERA_PADDING: PaddingOptions = { top: 56 + 40, right: 288 + 40, bottom: 40, left: 40 }

// bounding box of a territory's outer ring ([lng, lat] pairs)
function territoryBounds(t: Territory): LngLatBoundsLike {
    const ring = (JSON.parse(t.points) as number[][][])[0]
    const lngs = ring.map((c) => c[0])
    const lats = ring.map((c) => c[1])
    return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]]
}

function PropertyPanel({
    map,
    factions,
    events,
    territories,
}: {
    map: MapSummary | null
    factions: Faction[]
    events: EventMarker[]
    territories: Territory[]
}) {
    const [tab, setTab] = useState<Tab>('elements')
    const [selected, setSelected] = useSelection()
    const mapInstance = useMap()

    // double-click a row: fly the map to that element
    const flyToTerritory = (t: Territory) => {
        setSelected({type: 'territory', id: t.id})
        mapInstance?.fitBounds(territoryBounds(t), { padding: CAMERA_PADDING, maxZoom: 12 })
    }
    const flyToEvent = (e: EventMarker) => {
        setSelected({type: 'event', id: e.id})
        mapInstance?.flyTo({ center: [e.longitude, e.latitude], zoom: Math.max(mapInstance.getZoom(), EVENTS_CLUSTER_MAX_ZOOM + 1), padding: CAMERA_PADDING })
    }

    const factionById = new Map(factions.map((f) => [f.id, f]))

    // territories and events have separate id sequences, so match on type + id
    const isSelected = (type: 'territory' | 'event', id: number) => selected?.type === type && selected.id === id

    return (
        <div className="absolute top-14 right-0 bottom-0 w-72 bg-neutral-900 text-gray-300 shadow-lg flex flex-col">
            <div className="p-4 border-b border-neutral-800">
                <h2 className="font-bold text-lg text-white">{map?.title ?? 'Map'}</h2>
                {map?.description && <p className="text-sm text-gray-400 mt-1">{map.description}</p>}
            </div>

            <div role="tablist" className="flex border-b border-neutral-800 text-sm">
                <TabButton active={tab === 'factions'} onClick={() => setTab('factions')}>
                    Factions ({factions.length})
                </TabButton>
                <TabButton active={tab === 'elements'} onClick={() => setTab('elements')}>
                    Elements ({territories.length + events.length})
                </TabButton>
            </div>

            {/* only the tab content scrolls; header and tabs stay put */}
            <div className="flex-1 overflow-y-auto p-4">
                {tab === 'factions' && (
                    <ul className="flex flex-col gap-1">
                        {factions.length === 0 && <p className="text-sm text-gray-400">No factions yet.</p>}
                        {factions.map((faction) => (
                            <li key={faction.id} className="flex items-center gap-2 px-2 py-1 hover:bg-white/5">
                                <Swatch color={faction.color} />
                                <span className="flex-1 truncate">{faction.name}</span>
                                <span className="text-xs text-gray-500">
                                    {territories.filter((t) => t.factionId === faction.id).length}T
                                    {' · '}
                                    {events.filter((e) => e.factionId === faction.id).length}E
                                </span>
                            </li>
                        ))}
                    </ul>
                )}

                {tab === 'elements' && (
                    <div className="flex flex-col gap-3">
                        <Section title="Territories" count={territories.length}>
                            {territories.map((t) => (
                                <li
                                    key={t.id}
                                    aria-current={isSelected('territory', t.id) || undefined}
                                    title="Double-click to show on map"
                                    onClick={() => {setSelected({type:"territory", id: t.id})}}
                                    onDoubleClick={() => flyToTerritory(t)}
                                    className={rowClass(isSelected('territory', t.id))}
                                >
                                    <Swatch color={t.color} />
                                    {/* name is optional in the add form, so fall back to the id */}
                                    <span className="flex-1 truncate">{t.name || `Territory #${t.id}`}</span>
                                    <span className="text-xs text-gray-500 truncate">{factionById.get(t.factionId)?.name}</span>
                                </li>
                            ))}
                        </Section>

                        <Section title="Events" count={events.length}>
                            {events.map((e) => (
                                <li
                                    key={e.id}
                                    aria-current={isSelected('event', e.id) || undefined}
                                    title="Double-click to show on map"
                                    onClick={() => {setSelected({type:"event", id: e.id})}}
                                    onDoubleClick={() => flyToEvent(e)}
                                    className={rowClass(isSelected('event', e.id))}
                                >
                                    {/* events have no color of their own, so show their faction's */}
                                    <Swatch color={factionById.get(e.factionId)?.color} />
                                    <CategoryIcon category={categoryOf(e)} />
                                    <span className="flex-1 truncate">{e.title || `Event #${e.id}`}</span>
                                    <span className="text-xs text-gray-500">{new Date(e.timestamp).toLocaleDateString()}</span>
                                </li>
                            ))}
                        </Section>
                    </div>
                )}
            </div>
        </div>
    )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            role="tab"
            aria-selected={active}
            onClick={onClick}
            className={`flex-1 px-3 py-2 uppercase tracking-wider border-b-2 transition-colors ${
                active ? 'border-amber-400 text-amber-300' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
        >
            {children}
        </button>
    )
}

// collapsible group; open by default
function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
    const [open, setOpen] = useState(true)

    return (
        <div>
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                className="flex w-full items-center gap-2 px-1 py-1 text-sm font-semibold text-white hover:text-amber-300"
            >
                <span className="w-3 text-xs">{open ? '▾' : '▸'}</span>
                {title}
                <span className="text-gray-500 font-normal">({count})</span>
            </button>

            {open && (
                <ul className="mt-1 flex flex-col gap-0.5 text-sm">
                    {count === 0 ? <li className="px-2 py-1 text-gray-500">None yet.</li> : children}
                </ul>
            )}
        </div>
    )
}

// amber bar on the left + tint marks the selected row, matching the amber accent elsewhere;
// unselected rows keep a transparent bar so text doesn't shift when selection changes
function rowClass(selected: boolean) {
    // select-none: double-clicking would otherwise highlight the row's text
    return `flex items-center gap-2 px-2 py-1 border-l-2 cursor-pointer select-none ${
        selected ? 'border-amber-400 bg-amber-400/10 text-amber-200' : 'border-transparent hover:bg-white/5'
    }`
}

// the event's category icon; the svgs are black, so `invert` makes them white on the dark panel
function CategoryIcon({ category }: { category: EventCategory }) {
    const { label, icon } = EVENT_CATEGORIES[category]
    if (!icon) return <span className="w-3.5 shrink-0" title={label} />
    return <img src={icon} alt={label} title={label} className="h-5.5 w-5.5 shrink-0 invert" />
}

function Swatch({ color }: { color?: string }) {
    return <span className="inline-block w-3 h-3 shrink-0" style={{ backgroundColor: color ?? '#525252' }} />
}

export default PropertyPanel
