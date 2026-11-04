import { useEffect, useRef, useState } from "react"
import type { ChangeEvent } from "react"
import { eventBars, timelineTicks } from "../map/timeline"
import { parseServerTime } from "../map/eventTime"
import { useSelection, type Selection } from "../store/MapContext"
import type { EventMarker, Territory } from "../types/types"

const HOUR_MS = 60 * 60 * 1000
// playback: the visible range plays in about PLAY_DURATION_MS, one step every PLAY_TICK_MS
const PLAY_DURATION_MS = 70_000
const PLAY_TICK_MS = 1000
// zoom: each wheel notch shows this much more/less, down to MIN_SPAN_MS across the bar
const ZOOM_STEP = 1.25
const MIN_SPAN_MS = 6 * HOUR_MS
// dragging within this many pixels of a territory change lands exactly on it
const SNAP_PX = 8
// the slider's thumb (14px, see .timeline-range in index.css) stays inside the bar, so its centre runs
// from 5px to width - 5px, not 0 to 100%: ticks go on that same track so they line up with it
const THUMB_PX = 14

// times the selected territory changed shape: the `from` of each history entry before its end
function territoryTicks(territories: Territory[], selected: Selection): number[] {
    if (selected?.type !== 'territory') return []
    const territory = territories.find((t) => t.id === selected.id)
    const end = territory?.endTime ? parseServerTime(territory.endTime) : Number.POSITIVE_INFINITY
    // parseServerTime, not Date.parse: the backend sends UTC without a zone, which Date.parse would read as local time
    // an undated shape has no time to mark
    const times = territory?.history?.flatMap((s) => (s.from ? [parseServerTime(s.from)] : [])).filter((time) => time < end) ?? []
    return [...new Set(times)] // once each, even if two states share a time
}

// a window of `span` that stays inside [min, max]
function clampWindow(start: number, span: number, min: number, max: number) {
    const s = Math.min(Math.max(start, min), Math.max(min, max - span))
    return { start: s, end: Math.min(max, s + span) }
}

function TimeLine({
    min,
    max,
    now,
    territories,
    events,
    onChange,
    noPanel = false,
}: {
    min: number,
    max: number,
    now: number,
    territories: Territory[],
    events: EventMarker[], // the shown ones (visible layers), for the event strip
    onChange: (time: number) => void
    noPanel?: boolean // no property panel beside the map: center on the whole width
}) {
    const [playing, setPlaying] = useState(false)
    const [selected] = useSelection()

    // the bar's width in pixels decides how fine the ticks and labels can be
    const barRef = useRef<HTMLDivElement>(null)
    const [barWidth, setBarWidth] = useState(576)
    useEffect(() => {
        const bar = barRef.current
        if (!bar) return
        const observer = new ResizeObserver(([entry]) => setBarWidth(entry.contentRect.width))
        observer.observe(bar)
        return () => observer.disconnect()
    }, [])

    // zoom: the part of [min, max] the bar shows; null = all of it. If the date is outside the window
    // (playback, Live, a jump), the window slides over to it, keeping its width
    const [zoom, setZoom] = useState<{ start: number; end: number } | null>(null)
    let view = zoom ? clampWindow(zoom.start, zoom.end - zoom.start, min, max) : { start: min, end: max }
    const span = Math.max(view.end - view.start, 1)
    if (zoom && (now < view.start || now > view.end)) view = clampWindow(now - span / 2, span, min, max)
    const percent = (t: number) => ((t - view.start) / span) * 100
    // a share (0..1) of the track as a CSS position, and a share as a CSS width
    const atShare = (share: number) => `calc(${THUMB_PX / 2}px + (100% - ${THUMB_PX}px) * ${share})`
    const shareWidth = (share: number) => `calc((100% - ${THUMB_PX}px) * ${share})`
    const onTrack = (t: number) => atShare(percent(t) / 100)

    const ticks = timelineTicks(view.start, view.end, barWidth)
    const territoryMarks = territoryTicks(territories, selected).filter((t) => t >= view.start && t <= view.end)

    // events: a bar chart under the labels of how many start in each slice of the bar
    const strip = eventBars(events.map((e) => parseServerTime(e.timestamp)), view.start, view.end, barWidth - THUMB_PX)
    const formatDate = (t: number) => new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

    // the wheel zooms around the cursor; shift+wheel or a sideways swipe pans. A native listener, since
    // React's wheel events are passive and can't stop the page from scrolling
    const viewRef = useRef(view)
    useEffect(() => {
        viewRef.current = view
    })
    // the listener is on the whole timeline box, not just the bar: a pinch or ctrl+wheel anywhere on it
    // zooms the timeline instead of the browser zooming the page
    const panelRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const panel = panelRef.current
        const bar = barRef.current
        if (!panel || !bar) return
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault()
            const { start, end } = viewRef.current
            const current = end - start
            const full = max - min
            // pan: shift+wheel (macOS already turns it into a sideways scroll) or a sideways trackpad swipe
            if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                const sideways = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
                if (current >= full || sideways === 0) return
                setZoom(clampWindow(start + (sideways / bar.clientWidth) * current, current, min, max))
                return
            }
            if (e.deltaY === 0) return
            // zoom, keeping the time under the cursor where it is (off the bar: its nearest end)
            const ratio = Math.min(1, Math.max(0, (e.clientX - bar.getBoundingClientRect().left) / bar.clientWidth))
            const at = start + ratio * current
            // by how far the wheel turned: a mouse notch (~100) is one ZOOM_STEP; a trackpad pinch (ctrlKey)
            // sends many small deltas, so each counts more but the result stays smooth
            const notches = Math.min(2, Math.max(-2, e.ctrlKey ? e.deltaY / 10 : e.deltaY / 100))
            const next = Math.min(full, Math.max(MIN_SPAN_MS, current * ZOOM_STEP ** notches))
            if (next >= full) return setZoom(null)
            setZoom(clampWindow(at - ((at - start) / current) * next, next, min, max))
        }
        panel.addEventListener('wheel', handleWheel, { passive: false })
        return () => panel.removeEventListener('wheel', handleWheel)
    }, [min, max])

    // playback: move the date forward one step at a time through the visible range, stopping at the end
    useEffect(() => {
        if (!playing) return
        const timer = setTimeout(() => {
            const next = Math.min(max, Math.round(now + span / (PLAY_DURATION_MS / PLAY_TICK_MS))) // whole ms, like every saved time
            onChange(next)
            if (next >= max) setPlaying(false)
        }, PLAY_TICK_MS)
        return () => clearTimeout(timer)
    }, [playing, now, max, span, onChange])

    const togglePlay = () => {
        if (playing) return setPlaying(false)
        if (now >= max) onChange(view.start) // at the end: play again from the start of the view
        setPlaying(true)
    }

    // dragging the tick strip (below the slider's track) moves the zoomed window, like dragging a map
    const zoomed = span < max - min
    const dragRef = useRef<{ x: number; start: number } | null>(null)
    const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!zoomed) return
        e.currentTarget.setPointerCapture(e.pointerId) // keep getting moves even off the bar
        dragRef.current = { x: e.clientX, start: view.start }
    }
    const handleDrag = (e: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current
        const bar = barRef.current
        if (!drag || !bar) return
        // the time under the pointer stays under it: dragging right shows earlier dates
        const shift = ((e.clientX - drag.x) / bar.clientWidth) * span
        setZoom(clampWindow(drag.start - shift, span, min, max))
    }
    const handleDragEnd = () => {
        dragRef.current = null
    }

    // zoom by a factor (below 1 = in) around the handle, like the wheel does around the cursor
    const zoomBy = (factor: number) => {
        const full = max - min
        const next = Math.min(full, Math.max(MIN_SPAN_MS, span * factor))
        if (next >= full) return setZoom(null)
        setZoom(clampWindow(now - next / 2, next, min, max))
    }

    const jumpTo = (t: number) => {
        setPlaying(false)
        onChange(t)
    }

    return (
        // bottom center of the map area (the property panel takes the right 24rem). Phones: across the
        // screen, just above the property sheet's bar
        <div
            ref={panelRef}
            className={`fixed bottom-6 z-40 flex -translate-x-1/2 items-center gap-4 bg-neutral-900 px-5 py-4 text-sm text-gray-300 shadow-xl ring-1 ring-white/10 ${noPanel ? 'left-1/2' : 'left-[calc((100%-24rem)/2)]'}
                max-md:inset-x-2 max-md:bottom-14 max-md:translate-x-0 max-md:gap-2 max-md:px-3 max-md:py-2`}
        >
            <button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? 'Pause' : 'Play through time'}
                title={playing ? 'Pause' : 'Play through time'}
                className={`flex h-7 w-7 items-center justify-center transition-colors ${playing ? 'bg-accent-400/15 text-accent-300' : 'text-gray-300 hover:bg-accent-400/15 hover:text-accent-300'}`}
            >
                {/* square, pixel-style icons drawn in currentColor, like the nav icons */}
                {playing ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                        <rect x="2" y="1" width="3" height="10" />
                        <rect x="7" y="1" width="3" height="10" />
                    </svg>
                ) : (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                        <path d="M3 1L11 6L3 11Z" />
                    </svg>
                )}
            </button>

            <div
                ref={barRef}
                title="Scroll to zoom; drag the ticks or Shift+scroll to move"
                className={`relative h-[82px] ${noPanel ? 'w-[min(52rem,calc(100vw-10rem))]' : 'w-[min(52rem,calc(100vw-30rem))]'} overflow-hidden max-md:w-auto max-md:min-w-0 max-md:flex-1`}
            >
                {/* the strip below the slider's track: drag it to move the zoomed window */}
                <div
                    onPointerDown={handleDragStart}
                    onPointerMove={handleDrag}
                    onPointerUp={handleDragEnd}
                    onPointerCancel={handleDragEnd}
                    className={`absolute inset-x-0 top-4 bottom-0 touch-none ${zoomed ? 'cursor-grab active:cursor-grabbing' : ''}`}
                />

                {/* ticks hang below the slider's track (it sits at the top ~16px), so it doesn't cover them.
                    They don't catch the pointer, so dragging works on top of them too */}
                {ticks.minor.map((t) => (
                    <div key={t} className="pointer-events-none absolute top-4 h-2.5 w-px -translate-x-1/2 bg-gray-500" style={{ left: onTrack(t) }} />
                ))}
                {ticks.labels.map(({ time, text }) => {
                    // centred under its tick, except near the bar's ends: there it grows inward, so the bar's
                    // edge doesn't cut it off
                    const at = percent(time)
                    const align = at < 8 ? 'left-0' : at > 92 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                    return (
                        <div key={time} className="pointer-events-none absolute top-4 -translate-x-1/2" style={{ left: onTrack(time) }}>
                            <div className="mx-auto h-3.5 w-0.5 bg-gray-300" />
                            <span className={`absolute top-4.5 ${align} whitespace-nowrap text-xs text-gray-300`}>
                                {text}
                            </span>
                        </div>
                    )
                })}

                <input
                    type="range"
                    aria-label="Map date"
                    min={view.start}
                    max={view.end}
                    step="any" // smooth, so it can land on any time - e.g. exactly on a territory change
                    value={now}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setPlaying(false) // dragging takes over from playback
                        const time = Number(e.target.value)
                        // close to a territory change: snap onto it, so its exact shape is shown
                        const snapMs = (SNAP_PX / Math.max(barWidth, 1)) * span
                        const nearest = territoryMarks.reduce<number | null>(
                            (best, t) => (Math.abs(t - time) <= snapMs && (best === null || Math.abs(t - time) < Math.abs(best - time)) ? t : best),
                            null,
                        )
                        onChange(Math.round(nearest ?? time)) // whole ms, like every saved time
                    }}
                    className="timeline-range absolute inset-x-0 top-0 w-full"
                />

                {/* the event strip, under the labels: click a bar to jump to the first event it counts */}
                {strip.bars.map(({ at, width, count, first, last }) => (
                    <button
                        key={at}
                        type="button"
                        onClick={() => jumpTo(first)}
                        title={`${count} ${count === 1 ? 'event' : 'events'}: ${formatDate(first)}${last !== first ? ` – ${formatDate(last)}` : ''}`}
                        aria-label={`Jump to ${count} events from ${new Date(first).toLocaleDateString()}`}
                        // the whole slice's height is clickable, however short the bar; 1px gaps keep bars apart
                        className="group absolute bottom-0 flex h-7 items-end px-px"
                        style={{ left: atShare(at), width: shareWidth(width) }}
                    >
                        <span
                            className="w-full bg-gray-400 group-hover:bg-accent-300"
                            // at least 8px, so a single event still shows
                            style={{ height: `max(8px, ${(count / strip.max) * 100}%)` }}
                        />
                    </button>
                ))}

                {/* the selected territory's shape changes, in blue below the track: click one to jump to it.
                    Below the slider's 16px, so they never get in the way of its handle */}
                {territoryMarks.map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => jumpTo(t)}
                        title={`Shape changes: ${new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`}
                        aria-label={`Jump to the territory's change on ${new Date(t).toLocaleDateString()}`}
                        // a 20×24px hit area around the thin line, so it's easy to hit
                        className="group absolute top-3 flex h-6 w-5 -translate-x-1/2 justify-center pt-1"
                        style={{ left: onTrack(t) }}
                    >
                        <span className="h-4 w-1 bg-blue-400 transition-all group-hover:w-1.5 group-hover:bg-blue-300" />
                    </button>
                ))}
            </div>

            {/* phones: no wheel or trackpad pinch, so zoom buttons (around the handle) */}
            <div className="flex flex-col md:hidden">
                <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1 / ZOOM_STEP ** 2)} className="h-8 w-8 text-lg transition-colors hover:bg-accent-400/15 hover:text-accent-300">+</button>
                <button type="button" aria-label="Zoom out" onClick={() => zoomBy(ZOOM_STEP ** 2)} className="h-8 w-8 text-lg transition-colors hover:bg-accent-400/15 hover:text-accent-300">−</button>
            </div>

            {zoom && (
                <button
                    type="button"
                    onClick={() => setZoom(null)}
                    title="Show the whole timeline"
                    className="shrink-0 px-2 py-1 font-mono text-xs text-gray-400 transition-colors hover:bg-accent-400/15 hover:text-accent-300"
                >
                    Reset<span className="max-md:hidden"> zoom</span>
                </button>
            )}
        </div>
    )
}


export default TimeLine
