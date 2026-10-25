import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import MapProvider from '../store/MapContext'
import TerritoryLayer from './TerritoryLayer'
import AddFaction from './AddFaction'
import AddEvent from './AddEvent'
import EditEvent from './EditEvent'
import EventMarkers from './EventMarkers'
import AnnotationLayer from './AnnotationLayer'
import AddAnnotation from './AddAnnotation'
import AnnotationEditor from './AnnotationEditor'
import SelectTool from './SelectTool'
import PropertyPanel from './PropertyPanel'
import MapControls from './MapControls'
import NavDropdown, { NavDropdownItem } from './NavDropDown'
import { navButtonClass } from '../styles/navStyles'
import { CloseIcon, CursorIcon, EyeIcon, HandIcon } from './icons'
import type { Annotation, EventMarker, Faction, MapSummary, Territory } from '../types/types'
import { getMapFactions } from '../api/faction'
import { getMapEvents, editEvent, deleteEvent } from '../api/event'
import { getMapTerritories } from '../api/territory'
import { editAnnotation, getMapAnnotations } from '../api/annotation'
import { getMapById, startDraft, publishMap, getDraftStatus } from '../api/map'
import type { DrawMode } from '../types/types'
import TopoLayer from './TopoLayer'
import TerrainLayer from './TerrainLayer'
import Viewshed from './Viewshed'
import TimeLine from './TimeLine'
import { territoryAt, territoryKey } from '../map/territoryTime'
import { parseServerTime } from '../map/eventTime'
import { DAY_MS } from '../map/eventTime'

function Map() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [factions, setFactions] = useState<Faction[]>([])
    const [events, setEvents] = useState<EventMarker[]>([])
    const [territories, setTerritories] = useState<Territory[]>([])
    const [annotations, setAnnotations] = useState<Annotation[]>([])
    const [showAddFaction, setShowAddFaction] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [editMode, setEditMode] = useState(false)
    const [isPlacingEvent, setIsPlacingEvent] = useState(false)
    const [isPlacingAnnotation, setIsPlacingAnnotation] = useState(false)
    const [isPlacingViewshed, setIsPlacingViewshed] = useState(false)
    const [mapSummary, setMapSummary] = useState<MapSummary | null>(null)
    const [drawMode, setDrawMode] = useState<DrawMode | null>("select")
    const [showTopo, setShowTopo] = useState<boolean | null>(null)
    const [showTerrain, setShowTerrain] = useState(false)
    // whether the draft has anything to publish - always taken from the backend so it survives reloads
    const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false)
    // the event whose edit form is open (from the event's right-click menu)
    const [editingEventId, setEditingEventId] = useState<number | null>(null)
    // the date the map shows (ms): decides which events are visible and how faded. The real clock
    // for now, refreshed every minute so events fade as time passes; a timeline slider can set it later
    const [now, setNow] = useState(() => Date.now())
    const [today] = useState(() => Date.now()) // real time in case there was no events, we use it as fallback
    const [live, setLive] = useState<boolean>(true)

    // territories as they were at the timeline's date: earlier shapes from their history, ones that
    // didn't exist yet or had ended left out. Rebuilt only when some territory switches state
    // (shownTerritoriesKey), not on every timeline tick - a new list makes TerritoryLayer redraw all polygons
    const shownTerritoriesKey = territoryKey(territories, now)
    const visibleTerritories = useMemo(
        () => territories.map((t) => territoryAt(t, now)).filter((t): t is Territory => t !== null),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- shownTerritoriesKey covers `now`
        [territories, shownTerritoriesKey],
    )

    // the timeline spans everything dated on the map: events (start, end) and territories (each
    // history state's start, end). Live can go past it to the present: the handle then sits at the
    // right end while the date label shows now
    const times = [
        ...events.flatMap((e) => (e.endTime ? [parseServerTime(e.timestamp), parseServerTime(e.endTime)] : [parseServerTime(e.timestamp)])),
        ...territories.flatMap((t) => [
            // a state from 1970 means "always" (see withShapeAt): not a real date, leave it out of the range
            ...(t.history ?? []).map((s) => parseServerTime(s.from)).filter((time) => time > 0),
            ...(t.endTime ? [parseServerTime(t.endTime)] : []),
        ]),
    ]
    const min = times.length > 0 ? Math.min(...times) : today - 30 * DAY_MS // nothing dated yet: the last 30 days
    const max = times.length > 0 ? Math.max(...times, min + DAY_MS) : today // at least a day, so the bar never has zero length
    

    useEffect(() => {
        if (!live) return;
        const timer = setInterval(() => setNow(Date.now()), 60_000)
        return () => clearInterval(timer)
    }, [live])
    const editingEvent = events.find((e) => e.id === editingEventId)

    const refreshDraftStatus = useCallback(() => {
        if (!id) return
        getDraftStatus(id)
            .then((status) => setHasUnpublishedChanges(status.hasChanges))
            .catch(() => { })
    }, [id])

    // on page load / switching maps
    useEffect(() => {
        refreshDraftStatus()
    }, [refreshDraftStatus])


    // Fetching map factions from db - draft copies while editing, published otherwise
    useEffect(() => {
        if (!id) return
        getMapFactions(id, editMode)
            .then(setFactions)
            .catch(() => setError('Could not load factions'))
            .finally(() => setLoading(false))
    }, [id, editMode])

    // Fetching map events from db - draft copies while editing, published otherwise
    useEffect(() => {
        if (!id) return
        getMapEvents(id, editMode)
            .then(setEvents)
            .catch(() => setError('Could not load events'))
    }, [id, editMode])

    // Fetching map territories from db - draft copies while editing, published otherwise
    useEffect(() => {
        if (!id) return
        getMapTerritories(id, editMode)
            .then(setTerritories)
            .catch(() => setError('Could not load territories'))
    }, [id, editMode])

    // Fetching map annotations from db - draft copies while editing, published otherwise
    useEffect(() => {
        if (!id) return
        getMapAnnotations(id, editMode)
            .then(setAnnotations)
            .catch(() => setError('Could not load annotations'))
    }, [id, editMode])

    // Fetching map summary from db
    useEffect(() => {
        if (!id) return
        getMapById(id).then(setMapSummary).catch(() => { })
    }, [id])

    // faction creation handle
    const handleFactionCreated = (faction: Faction) => {
        setFactions((prev) => [...prev, faction])
        refreshDraftStatus()
        setShowAddFaction(false)
    }

    // event creation handle
    // annotation creation handle
    const handleAnnotationCreated = (annotation: Annotation) => {
        setAnnotations((prev) => [...prev, annotation])
        refreshDraftStatus()
    }

    // annotation rotate/resize: update the map right away, save when the change is finished
    const handleAnnotationChange = (annotation: Annotation) => {
        setAnnotations((prev) => prev.map((a) => (a.id === annotation.id ? annotation : a)))
    }

    const handleAnnotationCommit = (annotation: Annotation) => {
        if (!id) return
        // PUT replaces every field, so send the whole annotation
        const { id: stableId, ...data } = annotation
        editAnnotation(id, stableId, data)
            .then(() => refreshDraftStatus())
            .catch(() => setError('Could not save annotation'))
    }

    const handleEventCreated = (event: EventMarker) => {
        setNow(Date.now())
        setEvents((prev) => [...prev, event])
        refreshDraftStatus()
    }


    const handleEventSaved = (event: EventMarker) => {
        setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)))
        refreshDraftStatus()
    }

    const handleEventDeleted = async (eventId: number) => {
        if (!id) return
        try {
            await deleteEvent(id, eventId)
            setEvents((prev) => prev.filter((e) => e.id !== eventId))
            refreshDraftStatus()
        } catch {
            setError('Could not delete event')
        }
    }

    const handleEventMoved = async (eventId: number, latitude: number, longitude: number) => {
        const event = events.find((e) => e.id === eventId)
        if (!id || !event) return
        setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, latitude, longitude } : e)))
        // PUT replaces every field, so send the whole event (without its id, that's in the URL)
        try {
            await editEvent(id, eventId, { ...event, latitude, longitude }) // the extra `id` is ignored by the backend
            refreshDraftStatus()
        } catch {
            setError('Could not move event')
        }
    }

    // territory creation handle
    const handleTerritoryCreated = (territory: Territory) => {
        setTerritories((prev) => [...prev, territory])
        refreshDraftStatus()
    }

    // territory edit/delete handles - useCallback keeps them stable so TerritoryLayer doesn't rebuild terra-draw
    const handleTerritoryUpdated = useCallback((territory: Territory) => {
        setTerritories((prev) => prev.map((t) => (t.id === territory.id ? territory : t)))
        refreshDraftStatus()
    }, [refreshDraftStatus])

    const handleTerritoryDeleted = useCallback((territoryId: number) => {
        setTerritories((prev) => prev.filter((t) => t.id !== territoryId))
        refreshDraftStatus()
    }, [refreshDraftStatus])

    // entering edit mode should start (or resume) a draft version
    const handleEditClick = () => {
        if (editMode) {
            setEditMode(false)
            setDrawMode(null)
            setIsPlacingEvent(false)
            setIsPlacingAnnotation(false)
            return
        }
        if (!id) return
        startDraft(id)
            .then(() => setEditMode(true))
            .catch(() => setError('Could not start draft'))
    }

    // publishing the draft closes edit mode
    const handlePublishClick = () => {
        if (!id) return
        publishMap(id)
            .then(() => {
                // setEditMode(false)
                setDrawMode(null)
                refreshDraftStatus()
            })
            .catch(() => setError('Could not publish'))
    }

    const handleTimeChange = (time: number) => {
        setLive(false);
        setNow(time);
    }

    // nav bar Live button: on = follow the real clock (timeline hidden); off = show the timeline to
    // pick a date, starting from where the clock is now
    const handleLiveToggle = () => {
        if (live) {
            setLive(false)
            return
        }
        setLive(true)
        setNow(Date.now())
    }

    if (!id) return <p>Map not found</p>

    return (
        <div className="relative">
            <MapProvider>
                <TerritoryLayer
                    mapId={id}
                    factions={factions}
                    territories={visibleTerritories}
                    now={now}
                    active={editMode}
                    mode={drawMode}
                    onModeChange={setDrawMode}
                    onCreated={handleTerritoryCreated}
                    onUpdated={handleTerritoryUpdated}
                    onDeleted={handleTerritoryDeleted}
                    onError={setError}
                />
                <AddAnnotation
                    mapId={id}
                    factions={factions}
                    active={isPlacingAnnotation}
                    onExit={() => setIsPlacingAnnotation(false)}
                    onCreated={handleAnnotationCreated}
                />
                <AddEvent
                    mapId={id}
                    factions={factions}
                    events={events}
                    active={isPlacingEvent}
                    onExit={() => setIsPlacingEvent(false)}
                    onCreated={handleEventCreated}
                />
                <AnnotationLayer annotations={annotations} factions={factions} />
                <AnnotationEditor
                    annotations={annotations}
                    active={editMode}
                    canDrag={drawMode === 'select'}
                    onChange={handleAnnotationChange}
                    onCommit={handleAnnotationCommit}
                />
                <EventMarkers events={events} factions={factions} onMoved={handleEventMoved} onEdit={setEditingEventId} 
                onDelete={handleEventDeleted} now={now} editMode={editMode} />
                {editingEvent && (
                    <EditEvent
                        mapId={id}
                        event={editingEvent}
                        factions={factions}
                        events={events}
                        onSaved={handleEventSaved}
                        onClose={() => setEditingEventId(null)}
                    />
                )}
                {/* view mode is always selectable; in edit mode only with the Select tool */}
                <SelectTool active={(!editMode || drawMode === 'select') && !isPlacingViewshed} editMode={editMode} territories={visibleTerritories} />
                <MapControls territories={territories} events={events} />
                <PropertyPanel map={mapSummary} factions={factions} events={events} territories={territories} />
                <TopoLayer visible={showTopo ? showTopo : false}></TopoLayer>
                <TerrainLayer enabled={showTerrain} />
                <Viewshed placing={isPlacingViewshed} onPlaced={() => setIsPlacingViewshed(false)} />
                {!live && <TimeLine min={min} max={max} now={now} onChange={handleTimeChange} />}
            </MapProvider>



            <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center gap-2 bg-neutral-900 text-gray-300 text-base px-3 select-none">
                <button
                    type="button"
                    onClick={handleEditClick}
                    className={navButtonClass}
                >
                    {editMode ? 'Exit Edit Mode' : 'Edit'}
                </button>



                {/* tools, edit mode only (view mode is always Select): Pan = only move the map (no tool),
                    Select = terra-draw's editing select; leaving it deselects, which saves any reshaped territory */}
                {editMode && (
                    <>
                        <button
                            type="button"
                            aria-label="Pan"
                            title="Pan - drag to move the map"
                            aria-pressed={drawMode === null && !isPlacingEvent && !isPlacingAnnotation}
                            onClick={() => {
                                setIsPlacingEvent(false)
                                setIsPlacingAnnotation(false)
                                setDrawMode(null)
                            }}
                            className={`${navButtonClass} ${drawMode === null && !isPlacingEvent && !isPlacingAnnotation ? 'bg-accent-400/15 text-accent-300' : ''}`}
                        >
                            <HandIcon />
                        </button>
                        <button
                            type="button"
                            aria-label="Select"
                            title="Select - click territories and events"
                            aria-pressed={drawMode === 'select'}
                            onClick={() => {
                                setIsPlacingEvent(false)
                                setIsPlacingAnnotation(false)
                                setDrawMode('select')
                            }}
                            className={`${navButtonClass} ${drawMode === 'select' ? 'bg-accent-400/15 text-accent-300' : ''}`}
                        >
                            <CursorIcon />
                        </button>
                    </>
                )}


                {editMode && (
                    <button
                        type="button"
                        onClick={() => setShowAddFaction(true)}
                        className={navButtonClass}
                    >
                        Add Faction
                    </button>
                )}

                {editMode && (
                    <button
                        type="button"
                        onClick={() => {
                            setIsPlacingAnnotation(false)
                            setIsPlacingViewshed(false)
                            setIsPlacingEvent(true)
                        }}
                        className={navButtonClass}
                    >
                        {isPlacingEvent ? 'Click on the map...' : 'Add Event'}
                    </button>
                )}

                {/* place an annotation: the next map click picks the spot (no draw/select tool, so that click isn't also handled by them) */}
                {editMode && (
                    <button
                        type="button"
                        onClick={() => {
                            setDrawMode(null)
                            setIsPlacingEvent(false)
                            setIsPlacingViewshed(false)
                            setIsPlacingAnnotation(true)
                        }}
                        className={navButtonClass}
                    >
                        {isPlacingAnnotation ? 'Click on the map...' : 'Add Annotation'}
                    </button>
                )}

                {editMode && (
                    <button
                        type="button"
                        onClick={handlePublishClick}
                        className={`${navButtonClass} flex items-center gap-2`}
                    >
                        Publish
                        {/* heartbeat square: there are draft changes waiting to be published */}
                        {hasUnpublishedChanges && (
                            <span
                                title="Unpublished changes"
                                className="h-2.5 w-2.5 bg-accent-400 animate-heartbeat motion-reduce:animate-none"
                            />
                        )}
                    </button>
                )}

                {editMode && (
                    <NavDropdown label="Draw">
                        <NavDropdownItem onClick={() => setDrawMode('polygon')}>Polygon</NavDropdownItem>
                    </NavDropdown>
                )}

                {/* map view toggles, pushed right together with the close button (ml-auto on the first one) */}
                <button
                    type="button"
                    aria-pressed={live}
                    title={live ? 'Showing the present - click to pick a date on the timeline' : 'Back to the present'}
                    onClick={handleLiveToggle}
                    className={`${navButtonClass} ml-auto flex items-center gap-1.5 ${live ? 'bg-accent-400/15 text-accent-300' : ''}`}
                >
                    <span className={`h-2 w-2 ${live ? 'bg-accent-400 animate-heartbeat motion-reduce:animate-none' : 'bg-gray-500'}`} />
                    Live
                </button>
                <button
                    type="button"
                    aria-pressed={showTopo ? showTopo : false}
                    aria-label="Topographic map"
                    title="Topographic map"
                    onClick={() => setShowTopo((on) => !on)}
                    className={`${navButtonClass} ${showTopo ? 'bg-accent-400/15 text-accent-300' : ''}`}
                >
                    Topo
                </button>

                {/* 3D terrain on/off: tilts the map when switched on, flat again when off */}
                <button
                    type="button"
                    aria-pressed={showTerrain}
                    aria-label="3D terrain"
                    title="3D terrain (right-drag or Ctrl+drag to tilt)"
                    onClick={() => setShowTerrain((on) => !on)}
                    className={`${navButtonClass} ${showTerrain ? 'bg-accent-400/15 text-accent-300' : ''}`}
                >
                    3D
                </button>

                {/* line of sight: the next map click places an observer; what it can't see turns gray.
                    Clears the other placing tools / editing select so that click isn't handled twice */}
                <button
                    type="button"
                    aria-pressed={isPlacingViewshed}
                    aria-label="Line of sight"
                    title="Line of sight - click a point to see what is visible from there"
                    onClick={() => {
                        setIsPlacingEvent(false)
                        setIsPlacingAnnotation(false)
                        if (editMode) setDrawMode(null)
                        setIsPlacingViewshed((on) => !on)
                    }}
                    className={`${navButtonClass} ${isPlacingViewshed ? 'bg-accent-400/15 text-accent-300' : ''}`}
                >
                    <EyeIcon />
                </button>

                {/* back to the maps list; a draft in progress stays saved on the backend */}
                <button
                    type="button"
                    aria-label="Close map"
                    title="Back to maps"
                    onClick={() => navigate('/maps')}
                    className={navButtonClass}
                >
                    <CloseIcon />
                </button>
            </nav>

            {loading && <p className="absolute bottom-4 left-4 bg-white px-2 py-1">Loading...</p>}
            {error && <p className="absolute bottom-4 left-4 text-red-600 bg-white px-2 py-1">{error}</p>}

            {showAddFaction && (
                <AddFaction mapId={id} onCreated={handleFactionCreated} onClose={() => setShowAddFaction(false)} />
            )}
        </div>
    )
}

export default Map
