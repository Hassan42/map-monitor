import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import MapProvider from '../store/MapContext'
import TerraDrawProvider from '../store/TerraDrawContext'
import TerritoryLayer from './TerritoryLayer'
import FactionForm from './FactionForm'
import ConfirmDialog from './ConfirmDialog'
import AddLayer from './AddLayer'
import AddEvent from './AddEvent'
import EditEvent from './EditEvent'
import EventMarkers from './EventMarkers'
import AnnotationLayer from './AnnotationLayer'
import AddAnnotation from './AddAnnotation'
import AddAnnotationLine from './AddAnnotationLine'
import AnnotationEditor from './AnnotationEditor'
import SelectTool from './SelectTool'
import PropertyPanel from './PropertyPanel'
import type { LayerKey } from './PropertyPanel'
import MapControls from './MapControls'
import NavDropdown, { NavDropdownItem } from './NavDropDown'
import { navButtonActiveClass, navButtonClass } from '../styles/navStyles'
import NavIcon from './NavIcon'
import handIcon from '../assets/icons/hand.svg'
import cursorIcon from '../assets/icons/cursor.svg'
import relationsIcon from '../assets/icons/relations.svg'
import topoIcon from '../assets/icons/topo.svg'
import toolsIcon from '../assets/icons/tools.svg'
import terrainIcon from '../assets/icons/terrain.svg'
import eyeIcon from '../assets/icons/eye.svg'
import rulerIcon from '../assets/icons/ruler.svg'
import cameraIcon from '../assets/icons/camera.svg'
import closeIcon from '../assets/icons/close.svg'
import allTimeIcon from '../assets/icons/all-time.svg'
import liveIcon from '../assets/icons/live.svg'
import addFactionIcon from '../assets/icons/add-faction.svg'
import addLayerIcon from '../assets/icons/add-layer.svg'
import addEventIcon from '../assets/icons/add-event.svg'
import addAnnotationIcon from '../assets/icons/add-annotation.svg'
import addTerritoryIcon from '../assets/icons/add-territory.svg'
import type { Annotation, EventMarker, MapChange, Faction, Layer, MapSummary, Territory } from '../types/types'
import { deleteFaction, getMapFactions } from '../api/faction'
import { getMapLayers } from '../api/layer'
import { getMapEvents, editEvent, deleteEvent } from '../api/event'
import { getMapTerritories } from '../api/territory'
import { editAnnotation, getMapAnnotations, deleteAnnotation } from '../api/annotation'
import { auth } from '../firebase/BaseConfig'
import { getMapById, startDraft, publishMap, getDraftStatus, discardChange } from '../api/map'
import type { DrawMode } from '../types/types'
import TopoLayer from './TopoLayer'
import TerrainLayer from './TerrainLayer'
import Viewshed from './Viewshed'
import Ruler from './Ruler'
import ScreenshotTool from './ScreenshotTool'
import DemoDirector from './DemoDirector'
import TimeLine from './TimeLine'
import PublishMenu from './PublishMenu'
import { byStackOrder, territoryAt, territoryKey } from '../map/territoryTime'
import { activeAt, parseServerTime } from '../map/eventTime'
import { DAY_MS } from '../map/eventTime'
import type { FillLevel } from '../map/boundariesFetch'
import PlaceSearch from './PlaceFinder'

function Map() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [factions, setFactions] = useState<Faction[]>([])
    const [layers, setLayers] = useState<Layer[]>([])
    const [events, setEvents] = useState<EventMarker[]>([])
    const [territories, setTerritories] = useState<Territory[]>([])
    // both first loads are done (even if one failed): the map can open on what's there
    const [eventsLoaded, setEventsLoaded] = useState(false)
    const [territoriesLoaded, setTerritoriesLoaded] = useState(false)
    const [annotations, setAnnotations] = useState<Annotation[]>([])
    const [showAddFaction, setShowAddFaction] = useState(false)
    const [editingFaction, setEditingFaction] = useState<Faction | null>(null)
    const [deletingFaction, setDeletingFaction] = useState<Faction | null>(null)
    const [showAddLayer, setShowAddLayer] = useState(false)
    // layers switched off in the property panel (null = elements in no layer): their elements leave the map
    const [hiddenLayers, setHiddenLayers] = useState<Set<LayerKey>>(() => new Set())
    const [searchParams] = useSearchParams()
    // ?demo: the landing page's demo, this same page played like a film from the date in ?from
    const demoFrom = searchParams.has('demo') ? Date.parse(searchParams.get('from') ?? '') : null
    const isDemo = demoFrom !== null && !Number.isNaN(demoFrom)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [editMode, setEditMode] = useState(false)
    const [isPlacingEvent, setIsPlacingEvent] = useState(false)
    const [isPlacingAnnotation, setIsPlacingAnnotation] = useState(false)
    const [isDrawingLine, setIsDrawingLine] = useState(false)
    const [isPlacingViewshed, setIsPlacingViewshed] = useState(false)
    // the ruler: map clicks draw measured lines instead of selecting or drawing territories
    const [isMeasuring, setIsMeasuring] = useState(false)
    const [isCapturing, setIsCapturing] = useState(false)
    const [mapSummary, setMapSummary] = useState<MapSummary | null>(null)
    const [drawMode, setDrawMode] = useState<DrawMode | null>("select")
    const [showTopo, setShowTopo] = useState<boolean | null>(true)
    const [showTerrain, setShowTerrain] = useState(isDemo)
    // nav bar toggle: lines between related events that have happened by the timeline's date
    const [showRelations, setShowRelations] = useState(isDemo)
    // nav bar toggle: every element at once, ignoring the timeline's date. Territories then show their
    // latest shape, so edits made meanwhile are saved as of the present (`editTime` below)
    const [showAllTime, setShowAllTime] = useState(!isDemo) // opens showing every date
    // bumped to reload the map's elements from the backend (after a change is discarded)
    const [elementsRevision, setElementsRevision] = useState(0)
    // bumped after every draft status refresh, i.e. after every edit: tells the open publish menu to reload
    const [draftRevision, setDraftRevision] = useState(0)
    // whether the draft has anything to publish - always taken from the backend so it survives reloads
    const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false)
    // the event whose edit form is open (from the event's right-click menu)
    const [editingEventId, setEditingEventId] = useState<number | null>(null)
    // the date the map shows (ms): decides which events are visible and how faded. The real clock
    // for now, refreshed every minute so events fade as time passes; a timeline slider can set it later
    const [now, setNow] = useState(() => (isDemo ? demoFrom : Date.now()))
    const [today] = useState(() => Date.now()) // real time in case there was no events, we use it as fallback
    const [live, setLive] = useState<boolean>(false)

    const [fillLevel, setFillLevel] = useState<FillLevel | null>(null)
    const stopFill = useCallback(() => setFillLevel(null), [])

    const startFill = (level: FillLevel) => {
        pickPan()          // switches the other tools off
        setFillLevel(level)
    }
    // territories as they were at the timeline's date: earlier shapes from their history, ones that
    // didn't exist yet or had ended left out. Rebuilt only when some territory switches state
    // (shownTerritoriesKey), not on every timeline tick - a new list makes TerritoryLayer redraw all polygons
    const shownTerritoriesKey = territoryKey(territories, now)
    // the date edits are made at: the timeline's, or with All time (no date shown, latest shapes)
    // Infinity - a territory edit then replaces its latest shape instead of adding a dated one
    const editTime = showAllTime ? Number.POSITIVE_INFINITY : now
    const visibleTerritories = useMemo(
        () => (showAllTime
            ? territories // All time: each in its latest shape (its own points), ended ones included
            : territories.map((t) => territoryAt(t, now)).filter((t): t is Territory => t !== null)
        ).filter((t) => !hiddenLayers.has(t.layerId ?? null)).sort(byStackOrder), // bottom first: the drawing order
        // eslint-disable-next-line react-hooks/exhaustive-deps -- shownTerritoriesKey covers `now`
        [territories, shownTerritoriesKey, showAllTime, hiddenLayers],
    )
    // events and annotations of the shown layers - memoized so the map layers don't redraw on every render
    const shownEvents = useMemo(() => events.filter((e) => !hiddenLayers.has(e.layerId ?? null)), [events, hiddenLayers])
    // annotations also by date (start/end; All time shows them all). Keyed on which ones are on the map,
    // not on `now`, so a timeline tick only redraws when one appears or disappears
    const shownAnnotationsKey = showAllTime ? 'all' : annotations.filter((a) => activeAt(a, now)).map((a) => a.id).join(',')
    const shownAnnotations = useMemo(
        () => annotations.filter((a) => !hiddenLayers.has(a.layerId ?? null) && (showAllTime || activeAt(a, now))),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- shownAnnotationsKey covers `now`
        [annotations, hiddenLayers, shownAnnotationsKey, showAllTime],
    )

    const handleToggleLayer = (layer: LayerKey) => {
        setHiddenLayers((prev) => {
            const next = new Set(prev)
            if (next.has(layer)) next.delete(layer)
            else next.add(layer)
            return next
        })
    }

    // the timeline spans everything dated on the map: events (start, end) and territories (each
    // history state's start, end). Live can go past it to the present: the handle then sits at the
    // right end while the date label shows now
    const times = [
        ...events.flatMap((e) => (e.endTime ? [parseServerTime(e.timestamp), parseServerTime(e.endTime)] : [parseServerTime(e.timestamp)])),
        ...territories.flatMap((t) => [
            // an undated state has no date to put in the range
            ...(t.history ?? []).flatMap((s) => (s.from ? [parseServerTime(s.from)] : [])),
            ...(t.endTime ? [parseServerTime(t.endTime)] : []),
        ]),
    ]
    const min = times.length > 0 ? Math.min(...times) : today - 30 * DAY_MS // nothing dated yet: the last 30 days
    const max = times.length > 0 ? Math.max(...times, min + DAY_MS) : today // the latest element's date; at least a day long

    useEffect(() => {
        if (!live) return;
        const timer = setInterval(() => setNow(Date.now()), 60_000)
        return () => clearInterval(timer)
    }, [live])
    const editingEvent = events.find((e) => e.id === editingEventId)

    // only the owner edits; visitors (and other users of a public map) just view the published map
    const canEdit = mapSummary?.owned === true

    const refreshDraftStatus = useCallback(() => {
        if (!id || !canEdit) return // the draft is the owner's alone
        getDraftStatus(id)
            .then((status) => {
                setHasUnpublishedChanges(status.hasChanges)
                setDraftRevision((r) => r + 1)
            })
            .catch(() => { })
    }, [id, canEdit])

    // on page load / switching maps
    useEffect(() => {
        refreshDraftStatus()
    }, [refreshDraftStatus])



    // Fetching map factions from db - draft copies while editing, published otherwise
    useEffect(() => {
        if (!id) return
        getMapFactions(id, editMode)
            .then(setFactions)
            .catch(() => setError('Could not load actors'))
            .finally(() => setLoading(false))
    }, [id, editMode, elementsRevision])

    // Fetching map layers from db - draft copies while editing, published otherwise
    useEffect(() => {
        if (!id) return
        getMapLayers(id, editMode)
            .then(setLayers)
            .catch(() => setError('Could not load layers'))
    }, [id, editMode, elementsRevision])

    // Fetching map events from db - draft copies while editing, published otherwise
    useEffect(() => {
        if (!id) return
        getMapEvents(id, editMode)
            .then(setEvents)
            .catch(() => setError('Could not load events'))
            .finally(() => setEventsLoaded(true))
    }, [id, editMode, elementsRevision])

    // Fetching map territories from db - draft copies while editing, published otherwise
    useEffect(() => {
        if (!id) return
        getMapTerritories(id, editMode)
            .then(setTerritories)
            .catch(() => setError('Could not load territories'))
            .finally(() => setTerritoriesLoaded(true))
    }, [id, editMode, elementsRevision])

    // Fetching map annotations from db - draft copies while editing, published otherwise
    useEffect(() => {
        if (!id) return
        getMapAnnotations(id, editMode)
            .then(setAnnotations)
            .catch(() => setError('Could not load annotations'))
    }, [id, editMode, elementsRevision])

    // Fetching map summary from db
    useEffect(() => {
        if (!id) return
        getMapById(id).then(setMapSummary).catch(() => { })
    }, [id])



    // faction form handle: an edited faction replaces itself, a new one joins the list
    const handleFactionSaved = (faction: Faction) => {
        setFactions((prev) => prev.some((f) => f.id === faction.id) ? prev.map((f) => (f.id === faction.id ? faction : f)) : [...prev, faction])
        refreshDraftStatus()
        setShowAddFaction(false)
        setEditingFaction(null)
    }

    const handleFactionDelete = (faction: Faction) => {
        setDeletingFaction(null)
        if (!id) return
        deleteFaction(id, faction.id)
            .then(() => {
                setFactions((prev) => prev.filter((f) => f.id !== faction.id))
                refreshDraftStatus()
            })
            .catch(() => setError('Could not delete the actor'))
    }

    // layer creation handle
    const handleLayerCreated = (layer: Layer) => {
        setLayers((prev) => [...prev, layer])
        refreshDraftStatus()
        setShowAddLayer(false)
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

    const handleAnnotationDeleted = (annotationId: number) => {
        if (!id) return
        deleteAnnotation(id, annotationId)
            .then(() => {
                setAnnotations((prev) => prev.filter((a) => a.id !== annotationId))
                refreshDraftStatus()
            })
            .catch(() => setError('Could not delete annotation'))
    }

    const handleEventCreated = (event: EventMarker) => {
        // show the timeline at the new event. Live's clock only ticks once a minute, so an event dated
        // "just now" can be newer than it: catch the clock up so the event shows
        setNow(live ? Date.now() : parseServerTime(event.timestamp))
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
            setIsDrawingLine(false)
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

    // the publish menu's discard: the element goes back to how it's published, so reload the elements
    const handleDiscardChange = (change: MapChange) => {
        if (!id) return
        discardChange(id, change)
            .then(() => {
                setElementsRevision((r) => r + 1)
                refreshDraftStatus() // also reloads the publish menu
            })
            .catch(() => setError(change.entityType === 'FACTION' ? 'Could not discard: the actor may still be in use' : 'Could not discard the change'))
    }

    // import handle: the backend copied elements (and maybe factions) too, so reload them all
    const handleLayersImported = () => {
        setElementsRevision((r) => r + 1)
        refreshDraftStatus()
        setShowAddLayer(false)
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
            // the timeline opens at the present, unless the map's dates end earlier (e.g. a 2006 map):
            // then at its last date, so the handle and the date shown are on the bar
            setNow((time) => Math.min(Math.max(time, min), max))
            return
        }
        setLive(true)
        setNow(Date.now())
    }

    // the edit tools, used by the desktop buttons and the phone menus alike. Pan = only move the map
    // (no tool), Select = terra-draw's editing select; placing tools clear the others, so one click
    // isn't handled twice
    const pickPan = () => {
        setIsMeasuring(false)
        setIsCapturing(false)
        setIsPlacingEvent(false)
        setIsPlacingAnnotation(false)
        setIsDrawingLine(false)
        setFillLevel(null)
        setDrawMode(null)
    }
    const pickSelect = () => {
        setIsMeasuring(false)
        setIsCapturing(false)
        setIsPlacingEvent(false)
        setIsPlacingAnnotation(false)
        setIsDrawingLine(false)
        setFillLevel(null)
        setDrawMode('select')
    }
    const startAddEvent = () => {
        setIsMeasuring(false)
        setIsCapturing(false)
        setIsPlacingAnnotation(false)
        setIsDrawingLine(false)
        setIsPlacingViewshed(false)
        setFillLevel(null)
        setIsPlacingEvent(true)
    }
    // no draw/select tool while placing, so that click isn't also handled by them
    const startAddAnnotation = () => {
        setDrawMode(null)
        setIsMeasuring(false)
        setIsCapturing(false)
        setIsPlacingEvent(false)
        setIsPlacingViewshed(false)
        setIsDrawingLine(false)
        setFillLevel(null)
        setIsPlacingAnnotation(true)
    }
    // terra-draw's line mode instead of a tool (TerritoryLayer switches to it), like the ruler
    const startDrawLine = () => {
        setDrawMode(null)
        setIsMeasuring(false)
        setIsCapturing(false)
        setIsPlacingEvent(false)
        setIsPlacingViewshed(false)
        setIsPlacingAnnotation(false)
        setFillLevel(null)
        setIsDrawingLine(true)
    }
    const toggleViewshed = () => {
        setIsPlacingEvent(false)
        setIsPlacingAnnotation(false)
        setIsDrawingLine(false)
        if (editMode) setDrawMode(null)
        setIsMeasuring(false)
        setIsCapturing(false)
        setIsPlacingViewshed((on) => !on)
    }
    const toggleRuler = () => {
        setIsPlacingEvent(false)
        setIsPlacingAnnotation(false)
        setIsDrawingLine(false)
        setIsPlacingViewshed(false)
        if (editMode) setDrawMode(null)
        setIsCapturing(false)
        setIsMeasuring((on) => !on)
    }
    const toggleScreenshot = () => {
        setIsPlacingEvent(false)
        setIsPlacingAnnotation(false)
        setIsDrawingLine(false)
        setIsPlacingViewshed(false)
        setIsMeasuring(false)
        setIsCapturing((on) => !on)
    }
    const closeScreenshot = useCallback(() => setIsCapturing(false), [])
    const closeRuler = useCallback(() => setIsMeasuring(false), [])
    // nothing can be added before the map has an actor (the list is empty until it has loaded, too)
    const noActors = factions.length === 0
    const needsActorClass = 'cursor-not-allowed opacity-40'
    const isPanning = drawMode === null && !isPlacingEvent && !isPlacingAnnotation && !isDrawingLine && fillLevel === null

    if (!id) return <p>Map not found</p>

    return (
        <div className="relative">
            <MapProvider collapseCredits={isDemo}>
                <TerraDrawProvider>
                    <TerritoryLayer
                        mapId={id}
                        factions={factions}
                        layers={layers}
                        territories={visibleTerritories}
                        now={editTime}
                        active={editMode}
                        mode={drawMode}
                        onModeChange={setDrawMode}
                        onCreated={handleTerritoryCreated}
                        onUpdated={handleTerritoryUpdated}
                        onDeleted={handleTerritoryDeleted}
                        onError={setError}
                        measuring={isMeasuring}
                        drawingLine={isDrawingLine}
                        filling={fillLevel}
                        onFillDone={stopFill}
                    />
                    <AddAnnotationLine
                        mapId={id}
                        factions={factions}
                        layers={layers}
                        active={isDrawingLine}
                        onExit={() => setIsDrawingLine(false)}
                        onCreated={handleAnnotationCreated}
                    />
                    <AddAnnotation
                        mapId={id}
                        factions={factions}
                        layers={layers}
                        active={isPlacingAnnotation}
                        onExit={() => setIsPlacingAnnotation(false)}
                        onCreated={handleAnnotationCreated}
                    />
                    <AddEvent
                        mapId={id}
                        factions={factions}
                        layers={layers}
                        events={events}
                        now={editTime}
                        active={isPlacingEvent}
                        onExit={() => setIsPlacingEvent(false)}
                        onCreated={handleEventCreated}
                    />
                    <AnnotationLayer annotations={shownAnnotations} factions={factions} />
                    <AnnotationEditor
                        annotations={shownAnnotations}
                        factions={factions}
                        layers={layers}
                        active={editMode}
                        aboveTimeline={!live && !showAllTime}
                        onChange={handleAnnotationChange}
                        onCommit={handleAnnotationCommit}
                        onDelete={handleAnnotationDeleted}
                    />
                    
                    <EventMarkers events={shownEvents} factions={factions} onMoved={handleEventMoved} onEdit={setEditingEventId}
                        onDelete={handleEventDeleted} now={now} editMode={editMode} showRelations={showRelations} allTime={showAllTime} />
                    {editingEvent && (
                        <EditEvent
                            mapId={id}
                            event={editingEvent}
                            factions={factions}
                            layers={layers}
                            events={events}
                            onSaved={handleEventSaved}
                            onClose={() => setEditingEventId(null)}
                        />
                    )}
                    {/* view mode is always selectable; in edit mode only with the Select tool */}
                    <SelectTool active={(!editMode || drawMode === 'select') && !isPlacingViewshed && !isMeasuring} editMode={editMode} territories={visibleTerritories} />
                    {!isDemo && <MapControls territories={territories} events={events} loaded={eventsLoaded && territoriesLoaded} />}
                    {isDemo && <DemoDirector events={shownEvents} loaded={eventsLoaded && territoriesLoaded} from={demoFrom} onTime={handleTimeChange} />}
                    {!isDemo && <PropertyPanel
                        map={mapSummary}
                        factions={factions}
                        onEditFaction={editMode ? setEditingFaction : undefined}
                        onDeleteFaction={editMode ? setDeletingFaction : undefined}
                        layers={layers}
                        hiddenLayers={hiddenLayers}
                        onToggleLayer={handleToggleLayer}
                        onShowAllLayers={() => setHiddenLayers(new Set())}
                        events={events}
                        territories={territories}
                        annotations={annotations}
                        onFly={handleTimeChange}
                    />}
                    <TopoLayer visible={showTopo ? showTopo : false}></TopoLayer>
                    <TerrainLayer enabled={showTerrain} />
                    <Viewshed placing={isPlacingViewshed} onPlaced={() => setIsPlacingViewshed(false)} />
                    <Ruler measuring={isMeasuring} onClose={closeRuler} />
                    {isCapturing && <ScreenshotTool mapTitle={mapSummary?.title ?? 'map'} showTopo={!!showTopo} onClose={closeScreenshot} />}
                    {!live && !showAllTime && <TimeLine min={min} max={max} now={now} territories={territories} events={shownEvents} onChange={handleTimeChange} demo={isDemo} />}
                </TerraDrawProvider>




            {/* desktop: every tool as its own button. Phones (below md): the edit tools and the map toggles
                each fold into one menu, so the bar fits - plain show/hide classes, no checks in code */}
            {/* the demo has no nav bar, where the date normally is */}
            {isDemo && (
                <div className="fixed right-3 top-3 z-40 bg-neutral-900 px-4 py-2 text-right font-mono uppercase shadow-xl ring-1 ring-white/10">
                    <div className="text-lg font-bold leading-tight tracking-widest text-accent-300 md:text-2xl">
                        {new Date(now).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </div>
                    <div className="text-xs tracking-widest text-gray-400 max-md:hidden">
                        {new Date(now).toLocaleTimeString(undefined, { timeStyle: 'short' })}
                    </div>
                </div>
            )}

            {!isDemo && <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center gap-1 md:gap-2 bg-neutral-900 text-gray-300 text-base px-1 md:px-3 select-none">
                <div className="contents max-md:hidden">
                    {canEdit && (
                        <button
                            type="button"
                            onClick={handleEditClick}
                            className={navButtonClass}
                        >
                            {editMode ? 'Exit Edit Mode' : 'Edit'}
                        </button>
                    )}
                    {/* someone else's map: who made it, where the owner has Edit */}
                    {!canEdit && mapSummary?.creator && <Link to={`/users/${mapSummary.creator}`} className="whitespace-nowrap px-2 text-gray-200 hover:underline">by <span className="font-semibold text-accent-300">{mapSummary.creator}</span></Link>}


                    {/* tools, edit mode only (view mode is always Select): Pan = only move the map (no tool),
                    Select = terra-draw's editing select; leaving it deselects, which saves any reshaped territory */}
                    {editMode && (
                        <>
                            <button
                                type="button"
                                aria-label="Pan"
                                title="Pan - drag to move the map"
                                aria-pressed={isPanning}
                                onClick={pickPan}
                                className={`${navButtonClass} ${isPanning ? navButtonActiveClass : ''}`}
                            >
                                <NavIcon src={handIcon} />
                            </button>
                            <button
                                type="button"
                                aria-label="Select"
                                title="Select - click territories and events"
                                aria-pressed={drawMode === 'select'}
                                onClick={pickSelect}
                                className={`${navButtonClass} ${drawMode === 'select' ? navButtonActiveClass : ''}`}
                            >
                                <NavIcon src={cursorIcon} />
                            </button>
                        </>
                    )}

                    {editMode && (
                        <button
                            type="button"
                            aria-label="Add actor"
                            title="Add actor"
                            onClick={() => setShowAddFaction(true)}
                            className={navButtonClass}
                        >
                            <NavIcon src={addFactionIcon} />
                        </button>
                    )}

                    {editMode && (
                        <button
                            type="button"
                            aria-label="Add layer"
                            title="Add layer - group events, territories and annotations"
                            onClick={() => setShowAddLayer(true)}
                            className={navButtonClass}
                        >
                            <NavIcon src={addLayerIcon} />
                        </button>
                    )}

                    {/* pressed while waiting for the map click that places it */}
                    {editMode && (
                        <button
                            type="button"
                            aria-label="Add event"
                            aria-pressed={isPlacingEvent}
                            title={noActors ? 'Add an actor first' : isPlacingEvent ? 'Add event - click on the map to place it' : 'Add event'}
                            disabled={noActors}
                            onClick={startAddEvent}
                            className={`${navButtonClass} ${isPlacingEvent ? navButtonActiveClass : ''} ${noActors ? needsActorClass : ''}`}
                        >
                            <NavIcon src={addEventIcon} />
                        </button>
                    )}

                    {/* a ready annotation: the next map click picks the spot (no draw/select tool, so that click isn't
                        also handled by them). A line: drawn on the map, then the same form */}
                    {editMode && (noActors ? (
                        <button
                            type="button"
                            disabled
                            aria-label="Add annotation"
                            title="Add an actor first"
                            className={`${navButtonClass} ${needsActorClass}`}
                        >
                            <NavIcon src={addAnnotationIcon} />
                        </button>
                    ) : (
                        <NavDropdown
                            label={<NavIcon src={addAnnotationIcon} />}
                            ariaLabel="Add annotation"
                            title="Add annotation - a ready one or a drawn line"
                            active={isPlacingAnnotation || isDrawingLine}
                        >
                            <NavDropdownItem onClick={startAddAnnotation} active={isPlacingAnnotation}>Ready annotation</NavDropdownItem>
                            <NavDropdownItem onClick={startDrawLine} active={isDrawingLine}>Draw line</NavDropdownItem>
                        </NavDropdown>
                    ))}

                    {editMode && (noActors ? (
                        <button
                            type="button"
                            disabled
                            aria-label="Add territory"
                            title="Add an actor first"
                            className={`${navButtonClass} ${needsActorClass}`}
                        >
                            <NavIcon src={addTerritoryIcon} />
                        </button>
                    ) : (
                        <NavDropdown
                            label={<NavIcon src={addTerritoryIcon} />}
                            ariaLabel="Add territory"
                            title="Add territory - draw it as a polygon or freehand"
                            active={drawMode === 'polygon' || drawMode === 'freehand' || fillLevel !== null}
                        >
                            <NavDropdownItem onClick={() => { setFillLevel(null); setDrawMode('polygon') }}>Polygon</NavDropdownItem>
                            <NavDropdownItem onClick={() => { setFillLevel(null); setDrawMode('freehand') }}>Freehand</NavDropdownItem>
                            <NavDropdownItem onClick={() => startFill('country')}>Fill country</NavDropdownItem>
                            <NavDropdownItem onClick={() => startFill('state')}>Fill state</NavDropdownItem>
                        </NavDropdown>
                    ))}
                </div>

                {/* phones: Edit, or in edit mode one Tools menu (no territory drawing: too fiddly by finger) */}
                {canEdit && !editMode && (
                    <button type="button" onClick={handleEditClick} className={`${navButtonClass} md:hidden`}>Edit</button>
                )}
                {!canEdit && mapSummary?.creator && <Link to={`/users/${mapSummary.creator}`} className="max-w-28 truncate px-1 text-gray-200 hover:underline md:hidden">by <span className="font-semibold text-accent-300">{mapSummary.creator}</span></Link>}
                {editMode && (
                    <div className="md:hidden">
                        <NavDropdown
                            label={<NavIcon src={isPlacingEvent ? addEventIcon : isPlacingAnnotation || isDrawingLine ? addAnnotationIcon : drawMode === 'select' ? cursorIcon : handIcon} />}
                            ariaLabel="Edit tools"
                            active={!isPanning}
                        >
                            <NavDropdownItem onClick={pickPan} active={isPanning}><NavIcon src={handIcon} /> Pan</NavDropdownItem>
                            <NavDropdownItem onClick={pickSelect} active={drawMode === 'select'}><NavIcon src={cursorIcon} /> Select</NavDropdownItem>
                            <NavDropdownItem onClick={startAddEvent} active={isPlacingEvent} disabled={noActors}><NavIcon src={addEventIcon} /> Add event</NavDropdownItem>
                            <NavDropdownItem onClick={startAddAnnotation} active={isPlacingAnnotation} disabled={noActors}><NavIcon src={addAnnotationIcon} /> Add annotation</NavDropdownItem>
                            <NavDropdownItem onClick={startDrawLine} active={isDrawingLine} disabled={noActors}><NavIcon src={addAnnotationIcon} /> Draw line</NavDropdownItem>
                            <NavDropdownItem onClick={() => startFill('country')} active={fillLevel === 'country'} disabled={noActors}><NavIcon src={addTerritoryIcon} /> Fill country</NavDropdownItem>
                            <NavDropdownItem onClick={() => startFill('state')} active={fillLevel === 'state'} disabled={noActors}><NavIcon src={addTerritoryIcon} /> Fill state</NavDropdownItem>
                            <NavDropdownItem onClick={() => setShowAddFaction(true)}><NavIcon src={addFactionIcon} /> Add actor</NavDropdownItem>
                            <NavDropdownItem onClick={() => setShowAddLayer(true)}><NavIcon src={addLayerIcon} /> Add layer</NavDropdownItem>
                            <NavDropdownItem onClick={handleEditClick}>Exit edit mode</NavDropdownItem>
                        </NavDropdown>
                    </div>
                )}

                {editMode && (
                    // opens the draft's changes for a last look; publishing happens from there
                    <PublishMenu
                        mapId={id}
                        revision={draftRevision}
                        hasChanges={hasUnpublishedChanges}
                        onDiscard={handleDiscardChange}
                        onPublish={handlePublishClick}
                    />
                )}


                <div className="ml-auto flex items-center gap-1 whitespace-nowrap text-right text-lg font-semibold text-white max-md:text-base">
                    {/* All time shows every date at once, so there's no single date to show */}
                    {showAllTime ? 'All time' : (
                        <>
                            <span className="md:hidden">{new Date(now).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                            <span className="max-md:hidden">{new Date(now).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </>
                    )}
                </div>

                <span aria-hidden="true" className="mx-1 h-6 w-px bg-white/15 max-md:hidden" />

                {/* the right side, pushed over by ml-auto: time, then map layers, then close - one group each,
                    with a thin divider between them */}
                <div className="flex items-center gap-1">
                    {/* time: which dates the map shows */}
                    <button
                        type="button"
                        aria-pressed={showAllTime}
                        aria-label="All time"
                        title="All time - show everything on the map, regardless of date"
                        onClick={() => setShowAllTime((on) => !on)}
                        className={`${navButtonClass} ${showAllTime ? navButtonActiveClass : ''}`}
                    >
                        <NavIcon src={allTimeIcon} />
                    </button>
                    <button
                        type="button"
                        aria-pressed={live}
                        aria-label="Live"
                        title={showAllTime ? 'Live - not available while All time shows every date'
                            : live ? 'Live - showing the present; click to pick a date on the timeline' : 'Live - back to the present'}
                        // locked while All time is on: no date is shown then, so there's nothing to follow or pick
                        disabled={showAllTime}
                        onClick={handleLiveToggle}
                        className={`${navButtonClass} disabled:cursor-not-allowed disabled:text-gray-600 disabled:hover:bg-transparent ${live && !showAllTime ? navButtonActiveClass : ''}`}
                    >
                        {/* beats while live, like the unpublished-changes square */}
                        <NavIcon src={liveIcon} className={live && !showAllTime ? 'animate-heartbeat motion-reduce:animate-none' : ''} />
                    </button>
                </div>

                <span aria-hidden="true" className="mx-1 h-6 w-px bg-white/15 max-md:hidden" />

                {/* map layers and tools that only change the view */}
                <div className="flex items-center gap-1 max-md:hidden">
                    <button
                        type="button"
                        aria-pressed={showRelations}
                        aria-label="Event relations"
                        title="Relations - show how events relate (caused by, retaliation, part of), up to the timeline's date"
                        onClick={() => setShowRelations((on) => !on)}
                        className={`${navButtonClass} ${showRelations ? navButtonActiveClass : ''}`}
                    >
                        <NavIcon src={relationsIcon} />
                    </button>
                    <button
                        type="button"
                        aria-pressed={showTopo ? showTopo : false}
                        aria-label="Topographic map"
                        title="Topographic map"
                        onClick={() => setShowTopo((on) => !on)}
                        className={`${navButtonClass} ${showTopo ? navButtonActiveClass : ''}`}
                    >
                        <NavIcon src={topoIcon} />
                    </button>

                    {/* 3D terrain on/off: tilts the map when switched on, flat again when off */}
                    <button
                        type="button"
                        aria-pressed={showTerrain}
                        aria-label="3D terrain"
                        title="3D terrain (right-drag or Ctrl+drag to tilt)"
                        onClick={() => setShowTerrain((on) => !on)}
                        className={`${navButtonClass} ${showTerrain ? navButtonActiveClass : ''}`}
                    >
                        <NavIcon src={terrainIcon} />
                    </button>

                    {/* line of sight: the next map click places an observer; what it can't see turns gray.
                    Clears the other placing tools / editing select so that click isn't handled twice */}
                    <button
                        type="button"
                        aria-pressed={isPlacingViewshed}
                        aria-label="Line of sight"
                        title="Line of sight - click a point to see what is visible from there"
                        onClick={toggleViewshed}
                        className={`${navButtonClass} ${isPlacingViewshed ? navButtonActiveClass : ''}`}
                    >
                        <NavIcon src={eyeIcon} />
                    </button>

                    {/* ruler: map clicks draw lines labelled with their distances */}
                    <button
                        type="button"
                        aria-pressed={isMeasuring}
                        aria-label="Ruler"
                        title="Ruler - measure distances on the map"
                        onClick={toggleRuler}
                        className={`${navButtonClass} ${isMeasuring ? navButtonActiveClass : ''}`}
                    >
                        <NavIcon src={rulerIcon} />
                    </button>

                    {/* screenshot: drag a box over the map, pick a background, download a picture */}
                    <button
                        type="button"
                        aria-pressed={isCapturing}
                        aria-label="Screenshot"
                        title="Screenshot - save a picture of part of the map"
                        onClick={toggleScreenshot}
                        className={`${navButtonClass} ${isCapturing ? navButtonActiveClass : ''}`}
                    >
                        <NavIcon src={cameraIcon} />
                    </button>
                </div>

                <PlaceSearch />

                {/* phones: the same map layers and tools, in one menu */}
                <div className="md:hidden">
                    <NavDropdown
                        label={<NavIcon src={toolsIcon} />}
                        ariaLabel="Map layers and tools"
                        // not topo: it's on by default, which would leave this lit all the time
                        active={showRelations || showTerrain || isPlacingViewshed || isMeasuring || isCapturing}
                        align="right"
                    >
                        <NavDropdownItem onClick={() => setShowRelations((on) => !on)} active={showRelations}><NavIcon src={relationsIcon} /> Event relations</NavDropdownItem>
                        <NavDropdownItem onClick={() => setShowTopo((on) => !on)} active={!!showTopo}><NavIcon src={topoIcon} /> Topographic map</NavDropdownItem>
                        <NavDropdownItem onClick={() => setShowTerrain((on) => !on)} active={showTerrain}><NavIcon src={terrainIcon} /> 3D terrain</NavDropdownItem>
                        <NavDropdownItem onClick={toggleViewshed} active={isPlacingViewshed}><NavIcon src={eyeIcon} /> Line of sight</NavDropdownItem>
                        <NavDropdownItem onClick={toggleRuler} active={isMeasuring}><NavIcon src={rulerIcon} /> Ruler</NavDropdownItem>
                        <NavDropdownItem onClick={toggleScreenshot} active={isCapturing}><NavIcon src={cameraIcon} /> Screenshot</NavDropdownItem>
                    </NavDropdown>
                </div>

                <span aria-hidden="true" className="mx-1 h-6 w-px bg-white/15 max-md:hidden" />

                {/* back to the maps list; a draft in progress stays saved on the backend. A visitor who
                    isn't signed in has no list, so they go to the login page instead */}
                <button
                    type="button"
                    aria-label="Close map"
                    title={auth.currentUser ? 'Back to maps' : 'Sign in'}
                    onClick={() => navigate(auth.currentUser ? '/maps' : '/')}
                    className={navButtonClass}
                >
                    <NavIcon src={closeIcon} />
                </button>
            </nav>}
            </MapProvider>

            {loading && <p className="absolute bottom-4 left-4 bg-white px-2 py-1">Loading...</p>}
            {error && <p className="absolute bottom-4 left-4 text-red-600 bg-white px-2 py-1">{error}</p>}

            {showAddFaction && (
                <FactionForm mapId={id} onSaved={handleFactionSaved} onClose={() => setShowAddFaction(false)} />
            )}
            {editingFaction && (
                <FactionForm key={editingFaction.id} mapId={id} faction={editingFaction} onSaved={handleFactionSaved} onClose={() => setEditingFaction(null)} />
            )}
            {deletingFaction && (
                <ConfirmDialog
                    title={`Delete "${deletingFaction.name}"?`}
                    message="The actor is removed from this draft. It stays on the published map until you publish, and you can undo it from the publish menu before then."
                    onConfirm={() => handleFactionDelete(deletingFaction)}
                    onCancel={() => setDeletingFaction(null)}
                />
            )}
            {showAddLayer && (
                <AddLayer mapId={id} onCreated={handleLayerCreated} onImported={handleLayersImported}
                    onClose={() => setShowAddLayer(false)} />
            )}
        </div>
    )
}

export default Map
