import { useState, type ReactNode } from 'react'
import type { Annotation, EventCategory, EventMarker, Faction, Layer, LayerCredit, MapSummary, Territory } from '../types/types'
import { creditText } from '../map/layerCredit'
import type { LngLatBoundsLike } from 'maplibre-gl'
import { useContextMenu, useMap, useSelection } from '../store/MapContext'
import { EVENTS_CLUSTER_MAX_ZOOM } from '../map/mapLayers'
import { EVENT_CATEGORIES, categoryOf } from '../map/eventCategories'
import { ANNOTATION_KINDS } from '../map/annotationKinds'
import { parseServerTime } from '../map/eventTime'
import { cameraPadding } from '../map/cameraPadding'
import { useLongPress } from '../map/longPress'
import NavIcon from './NavIcon'
import shownIcon from '../assets/icons/visibility-public.svg'
import hiddenIcon from '../assets/icons/visibility-private.svg'


type Tab = 'factions' | 'elements'

// a layer's key in the hidden set: its id, or null for "No layer"
export type LayerKey = number | null


// bounding box of a territory's outer ring ([lng, lat] pairs)
function territoryBounds(t: Territory): LngLatBoundsLike {
    const ring = (JSON.parse(t.points) as number[][][])[0]
    const lngs = ring.map((c) => c[0])
    const lats = ring.map((c) => c[1])
    return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]]
}

// when a territory starts: its first shape's `from`. A state from 1970 means "always" (see withShapeAt): no date
function territoryStart(t: Territory): number | null {
    const from = t.history?.[0]?.from
    const time = from ? parseServerTime(from) : 0
    return time > 0 ? time : null
}

const formatDay = (time: number) => new Date(time).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
const formatYear = (time: number) => new Date(time).getFullYear()
const formatDate = (time: number) => new Date(time).toLocaleDateString(undefined, { dateStyle: 'medium' })

// one list for every element: events at their start, territories at their first shape, annotations at
// their start; undated ones (no start: always there) after the dated ones
type Entry =
    | { type: 'event'; id: number; time: number | null; item: EventMarker }
    | { type: 'territory'; id: number; time: number | null; item: Territory }
    | { type: 'annotation'; id: number; time: number | null; item: Annotation }

function PropertyPanel({
    map,
    factions,
    layers,
    hiddenLayers,
    onToggleLayer,
    onShowAllLayers,
    events,
    territories,
    annotations,
    onFly,
}: {
    map: MapSummary | null
    factions: Faction[]
    layers: Layer[]
    hiddenLayers: Set<LayerKey> // layers whose elements are hidden, on the map and in this list
    onToggleLayer: (layer: LayerKey) => void
    onShowAllLayers: () => void
    events: EventMarker[]
    territories: Territory[]
    annotations: Annotation[]
    onFly: (time: number) => void
}) {
    const [tab, setTab] = useState<Tab>('elements')
    // phones: the panel is a bottom sheet, folded down to its bar until opened
    const [sheetOpen, setSheetOpen] = useState(false)
    const [selected, setSelected] = useSelection()
    const [, setContextMenu] = useContextMenu()
    const mapInstance = useMap()

    // double-click a row: fly the map to that element, and the timeline to its start when it has one.
    // On phones the sheet folds down, so the map is in view
    const flyToTerritory = (t: Territory) => {
        setSheetOpen(false)
        const start = territoryStart(t)
        if (start !== null) onFly(start)
        setSelected({ type: 'territory', id: t.id })
        mapInstance?.fitBounds(territoryBounds(t), { padding: cameraPadding(), maxZoom: 12 })
    }
    const flyToEvent = (e: EventMarker) => {
        setSheetOpen(false)
        onFly(parseServerTime(e.timestamp))
        setSelected({ type: 'event', id: e.id })
        mapInstance?.flyTo({ center: [e.longitude, e.latitude], zoom: Math.max(mapInstance.getZoom(), EVENTS_CLUSTER_MAX_ZOOM + 3), padding: cameraPadding() })
    }
    const flyToAnnotation = (a: Annotation) => {
        setSheetOpen(false)
        if (a.startTime) onFly(parseServerTime(a.startTime))
        setSelected({ type: 'annotation', id: a.id })
        const center = JSON.parse(a.geometry).coordinates as [number, number]
        mapInstance?.flyTo({ center, zoom: Math.max(mapInstance.getZoom(), 10), padding: cameraPadding() })
    }

    const factionById = new Map(factions.map((f) => [f.id, f]))
    const layerById = new Map(layers.map((l) => [l.id, l]))
    const layerName = (id: number | null | undefined) => (id != null ? layerById.get(id)?.title : undefined)
    const shown = (el: { layerId?: number | null }) => !hiddenLayers.has(el.layerId ?? null)

    // the element types have separate id sequences, so match on type + id
    const isSelected = (type: Entry['type'], id: number) => selected?.type === type && selected.id === id

    const entries: Entry[] = [
        ...events.filter(shown).map((e): Entry => ({ type: 'event', id: e.id, time: parseServerTime(e.timestamp), item: e })),
        ...territories.filter(shown).map((t): Entry => ({ type: 'territory', id: t.id, time: territoryStart(t), item: t })),
        ...annotations.filter(shown).map((a): Entry => ({ type: 'annotation', id: a.id, time: a.startTime ? parseServerTime(a.startTime) : null, item: a })),
    ].sort((a, b) => (b.time ?? -Infinity) - (a.time ?? -Infinity)) // newest first; undated last
    const firstUndated = entries.findIndex((e) => e.time === null)
    const total = events.length + territories.length + annotations.length

    // the parts of a row's detail line that are known, joined by dots
    const detail = (...parts: (string | undefined | null | false)[]) => parts.filter(Boolean).join(' · ')

    // right-click a row: select it and open the same menu as right-clicking it on the map (edit mode)
    const openMenu = (entry: Entry) => (x: number, y: number) => {
        setSelected({ type: entry.type, id: entry.id })
        setContextMenu({ type: entry.type, id: entry.id, x, y })
    }

    const renderEntry = (entry: Entry) => {
        switch (entry.type) {
            case 'event': {
                const e = entry.item
                const category = categoryOf(e)
                return (
                    <Row
                        selected={isSelected('event', e.id)}
                        time={entry.time}
                        onClick={() => setSelected({ type: 'event', id: e.id })}
                        onDoubleClick={() => flyToEvent(e)}
                        onContextMenu={openMenu(entry)}
                        icon={<CategoryIcon category={category} color={factionById.get(e.factionId)?.color} />}
                        title={e.title || EVENT_CATEGORIES[category].label}
                        detail={detail(EVENT_CATEGORIES[category].label, factionById.get(e.factionId)?.name, layerName(e.layerId))}
                    />
                )
            }
            case 'territory': {
                const t = entry.item
                const faction = factionById.get(t.factionId)
                const end = t.endTime ? parseServerTime(t.endTime) : null
                const shapes = t.history?.length ?? 1
                return (
                    <Row
                        selected={isSelected('territory', t.id)}
                        time={entry.time}
                        onClick={() => setSelected({ type: 'territory', id: t.id })}
                        onDoubleClick={() => flyToTerritory(t)}
                        onContextMenu={openMenu(entry)}
                        icon={<Swatch color={t.color} />}
                        // the add form doesn't ask for a name any more, so most are named after their faction
                        title={t.name || `${faction?.name ?? 'Unknown'} territory`}
                        detail={detail(
                            end ? `until ${formatDate(end)}` : 'ongoing',
                            shapes > 1 && `${shapes} shapes`,
                            layerName(t.layerId),
                        )}
                    />
                )
            }
            case 'annotation': {
                const a = entry.item
                const kind = ANNOTATION_KINDS[a.kind]
                const faction = a.factionId != null ? factionById.get(a.factionId) : undefined
                return (
                    <Row
                        selected={isSelected('annotation', a.id)}
                        time={entry.time}
                        onClick={() => setSelected({ type: 'annotation', id: a.id })}
                        onDoubleClick={() => flyToAnnotation(a)}
                        onContextMenu={openMenu(entry)}
                        icon={<NavIcon src={kind.icon} className="!h-5.5 !w-5.5" />}
                        iconColor={a.color ?? faction?.color}
                        title={a.label ? `${kind.label} "${a.label}"` : kind.label}
                        detail={detail(
                            faction?.name,
                            // no start and no end: always there, nothing to say
                            a.endTime ? `until ${formatDate(parseServerTime(a.endTime))}` : a.startTime ? 'ongoing' : undefined,
                            layerName(a.layerId),
                        )}
                    />
                )
            }
        }
    }

    return (
        // desktop: a column on the right under the nav bar. Phones: a sheet across the bottom, 60% of the
        // screen when open, folded down to its 48px bar otherwise (above the timeline, under the nav bar)
        <div
            className={`absolute top-14 right-0 bottom-0 w-96 bg-neutral-900 text-gray-300 shadow-lg flex flex-col
                max-md:fixed max-md:top-auto max-md:inset-x-0 max-md:z-[45] max-md:w-auto max-md:h-[60dvh] max-md:transition-transform
                ${sheetOpen ? '' : 'max-md:translate-y-[calc(100%-3rem)]'}`}
        >
            {/* phones: the sheet's bar - tap to open or fold it */}
            <button
                type="button"
                aria-expanded={sheetOpen}
                onClick={() => setSheetOpen((open) => !open)}
                className="flex h-12 shrink-0 items-center gap-2 border-b border-neutral-800 px-4 text-left md:hidden"
            >
                <span className="flex-1 truncate font-semibold text-white">{map?.title ?? 'Map'}</span>
                <span className="text-xs text-gray-400">{total} elements</span>
                <span aria-hidden="true" className={`text-xs transition-transform ${sheetOpen ? 'rotate-180' : ''}`}>▲</span>
            </button>
            <div className="p-4 border-b border-neutral-800 max-md:hidden">
                <h2 className="font-bold text-lg text-white">{map?.title ?? 'Map'}</h2>
                {map?.description && <p className="text-sm text-gray-400 mt-1">{map.description}</p>}
            </div>

            <div role="tablist" className="flex border-b border-neutral-800 text-sm">
                <TabButton active={tab === 'factions'} onClick={() => setTab('factions')}>
                    Factions ({factions.length})
                </TabButton>
                <TabButton active={tab === 'elements'} onClick={() => setTab('elements')}>
                    Elements ({total})
                </TabButton>
            </div>

            {/* layers filter the list and the map together: a hidden layer's elements leave both */}
            {tab === 'elements' && (
                <div className="flex flex-wrap gap-1 border-b border-neutral-800 p-3">
                    {layers.map((l) => (
                        <LayerChip key={l.id} label={l.title} description={l.description} credit={l.credit} hidden={hiddenLayers.has(l.id)} onClick={() => onToggleLayer(l.id)} />
                    ))}
                    <LayerChip label="No layer" hidden={hiddenLayers.has(null)} onClick={() => onToggleLayer(null)} />
                    {/* only while something is hidden */}
                    {hiddenLayers.size > 0 && (
                        <button
                            type="button"
                            onClick={onShowAllLayers}
                            className="ml-auto px-2 py-1 text-xs text-gray-400 transition-colors hover:text-accent-300"
                        >
                            Show all
                        </button>
                    )}
                </div>
            )}

            {/* only the tab content scrolls; header, tabs and layers stay put */}
            <div className="flex-1 overflow-y-auto p-2">
                {tab === 'factions' && (
                    <ul className="flex flex-col gap-1 p-2">
                        {factions.length === 0 && <p className="text-sm text-gray-400">No factions yet.</p>}
                        {factions.map((faction) => (
                            <li key={faction.id} className="flex items-center gap-2 px-2 py-1 hover:bg-white/5">
                                <Swatch color={faction.color} />
                                <span className="flex-1 truncate">{faction.name}</span>
                                <span className="text-xs text-gray-500">
                                    {plural(territories.filter((t) => t.factionId === faction.id).length, 'territory', 'territories')}
                                    {' · '}
                                    {plural(events.filter((e) => e.factionId === faction.id).length, 'event', 'events')}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}

                {tab === 'elements' && (
                    <ul className="flex flex-col gap-0.5 text-sm">
                        {total === 0 && <li className="px-2 py-1 text-gray-500">Nothing on the map yet.</li>}
                        {total > 0 && entries.length === 0 && <li className="px-2 py-1 text-gray-500">Every layer is hidden.</li>}
                        {entries.map((entry, i) => (
                            <li key={`${entry.type}-${entry.id}`}>
                                {i === firstUndated && (
                                    <p className="mt-2 mb-1 border-t border-neutral-800 px-2 pt-2 text-xs uppercase tracking-wider text-gray-500">No date</p>
                                )}
                                {renderEntry(entry)}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}

// "1 event", "3 events"
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            role="tab"
            aria-selected={active}
            onClick={onClick}
            className={`flex-1 px-3 py-2 uppercase tracking-wider border-b-2 transition-colors ${active ? 'border-accent-400 text-accent-300' : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
        >
            {children}
        </button>
    )
}

// a layer's show/hide toggle; the description, if any, is its tooltip
function LayerChip({ label, description, credit, hidden, onClick }: { label: string; description?: string; credit?: LayerCredit | null; hidden: boolean; onClick: () => void }) {
    // the pill look sits on a wrapper: a link can't go inside the toggle button, so the arrow sits beside it
    return (
        <span
            className={`flex max-w-full items-center text-xs ring-1 transition-colors ${hidden
                ? 'text-gray-500 ring-white/10'
                : 'bg-accent-400/15 text-accent-200 ring-accent-400/40'
                }`}
        >
            <button
                type="button"
                aria-pressed={!hidden}
                title={`${description ? `${description}\n` : ''}Click to ${hidden ? 'show' : 'hide'}`}
                onClick={onClick}
                className={`flex min-w-0 items-center gap-1.5 px-2 py-1 ${hidden ? 'hover:text-gray-300' : 'hover:bg-accent-400/25'}`}
            >
                <NavIcon src={hidden ? hiddenIcon : shownIcon} className="!h-3.5 !w-3.5" />
                <span className={`truncate ${hidden ? 'line-through' : ''}`}>{label}</span>
            </button>
            {/* imported from another map: the arrow opens that map */}
            {credit && (
                <a
                    href={`/maps/${credit.mapId}`}
                    target="_blank" // the current map stays open
                    rel="noopener noreferrer"
                    title={creditText(credit)}
                    aria-label={creditText(credit)}
                    className="py-1 pr-2 pl-0.5 hover:text-accent-300"
                >
                    ↗
                </a>
            )}
        </span>
    )
}

// one element: date on the left (day, year under it), icon, then a bold title over a gray detail line
function Row({
    selected,
    time,
    onClick,
    onDoubleClick,
    onContextMenu,
    icon,
    iconColor,
    title,
    detail,
}: {
    selected: boolean
    time: number | null
    onClick: () => void
    onDoubleClick: () => void
    onContextMenu: (x: number, y: number) => void // at the pointer
    icon: ReactNode
    iconColor?: string
    title: string
    detail: string
}) {
    // touch has no right-click: holding a finger on the row opens the same menu
    const longPress = useLongPress(onContextMenu)
    return (
        <div
            {...longPress}
            aria-current={selected || undefined}
            title="Double-click to show on map"
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onContextMenu={(e) => {
                e.preventDefault() // no browser menu
                onContextMenu(e.clientX, e.clientY)
            }}
            className={rowClass(selected)}
        >
            <span className="w-11 shrink-0 text-xs leading-tight text-gray-500 tabular-nums">
                {time !== null && (
                    <>
                        {formatDay(time)}
                        <br />
                        {formatYear(time)}
                    </>
                )}
            </span>
            <span className="flex w-6 shrink-0 justify-center" style={iconColor ? { color: iconColor } : undefined}>{icon}</span>
            <span className="flex min-w-0 flex-1 flex-col">
                <span className={`truncate font-medium ${selected ? 'text-accent-200' : 'text-gray-100'}`}>{title}</span>
                {detail && <span className="truncate text-xs text-gray-500">{detail}</span>}
            </span>
        </div>
    )
}

// accent bar on the left + tint marks the selected row, matching the accent accent elsewhere;
// unselected rows keep a transparent bar so text doesn't shift when selection changes
function rowClass(selected: boolean) {
    // select-none: double-clicking would otherwise highlight the row's text
    return `flex items-center gap-2 px-2 py-1.5 border-l-2 cursor-pointer select-none ${selected ? 'border-accent-400 bg-accent-400/10' : 'border-transparent hover:bg-white/5'
        }`
}

// the event's category icon in a circle of its faction's color, like the marker on the map; the svgs
// are black, so `invert` makes them white
function CategoryIcon({ category, color }: { category: EventCategory; color?: string }) {
    const { label, icon } = EVENT_CATEGORIES[category]
    return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: color ?? '#525252' }} title={label}>
            {icon && <img src={icon} alt={label} className="h-4 w-4 invert" />}
        </span>
    )
}

function Swatch({ color }: { color?: string }) {
    return <span className="inline-block w-3 h-3 shrink-0" style={{ backgroundColor: color ?? '#525252' }} />
}

export default PropertyPanel
