import { DAY_MS } from './eventTime'

// ---- ticks: calendar units picked by how much room they get on the bar ----
// Ticks fall on calendar boundaries (midnight, Monday, the 1st, 1 January, years divisible by 5...), so
// labels read "2000, 2005, 2010" instead of drifting dates. The tick unit is the finest one whose ticks
// are at least MIN_TICK_PX apart; labels use the finest unit at least MIN_LABEL_PX apart

const MIN_TICK_PX = 8 // closer than this and ticks blur into a solid bar
const MIN_LABEL_PX = 80 // room for "Mar 2006" (12 px text) plus a gap

type Unit = {
    ms: number // roughly how long one unit is, to estimate the spacing
    floor: (d: Date) => Date // the unit boundary at or before d
    next: (d: Date) => Date // the next boundary
    label: (d: Date) => string
}

const days = (n: number): Unit => ({
    ms: n * DAY_MS,
    floor: (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()),
    next: (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n),
    label: (d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
})
const weeks: Unit = {
    ...days(7),
    floor: (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)), // Monday
}
const months = (n: number): Unit => ({
    ms: n * 30.4 * DAY_MS,
    floor: (d) => new Date(d.getFullYear(), d.getMonth() - (d.getMonth() % n), 1),
    next: (d) => new Date(d.getFullYear(), d.getMonth() + n, 1),
    label: (d) => d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
})
const years = (n: number): Unit => ({
    ms: n * 365.25 * DAY_MS,
    floor: (d) => new Date(d.getFullYear() - (d.getFullYear() % n), 0, 1),
    next: (d) => new Date(d.getFullYear() + n, 0, 1),
    label: (d) => String(d.getFullYear()),
})

const TICK_UNITS = [days(1), weeks, months(1), months(3), years(1), years(5), years(10), years(20), years(50)]
const LABEL_UNITS = [days(1), weeks, months(1), months(3), months(6), years(1), years(2), years(5), years(10), years(20), years(50)]

// the finest unit whose boundaries are at least `minPx` apart on the bar (the coarsest if none is)
const pickUnit = (units: Unit[], pxPerMs: number, minPx: number) =>
    units.find((u) => u.ms * pxPerMs >= minPx) ?? units[units.length - 1]

// every boundary of `unit` from `min` to `max`
function boundaries(unit: Unit, min: number, max: number): number[] {
    const out: number[] = []
    let d = unit.floor(new Date(min))
    if (d.getTime() < min) d = unit.next(d)
    for (let k = 0; d.getTime() <= max && k < 1000; k++, d = unit.next(d)) out.push(d.getTime())
    return out
}

// the timeline bar's ticks for a range on a bar `barWidth` px wide: short unlabeled ticks, and taller
// labeled ones with their text
export function timelineTicks(min: number, max: number, barWidth: number) {
    const pxPerMs = barWidth / Math.max(max - min, 1)
    const tickUnit = pickUnit(TICK_UNITS, pxPerMs, MIN_TICK_PX)
    const labelUnit = pickUnit(LABEL_UNITS.filter((u) => u.ms >= tickUnit.ms), pxPerMs, MIN_LABEL_PX)
    const labels = boundaries(labelUnit, min, max).map((time) => ({ time, text: labelUnit.label(new Date(time)) }))
    const labeled = new Set(labels.map((l) => l.time))
    const minor = boundaries(tickUnit, min, max).filter((t) => !labeled.has(t)) // labeled ones are drawn taller
    return { minor, labels }
}

// ---- the event strip under the labels: how many events start in each EVENT_BAR_PX slice ----

const EVENT_BAR_PX = 14 // the slice of the bar one bar counts: wide enough to click

// `at` and `width` are shares (0..1) of the track; `trackPx` is the track's width in pixels
export function eventBars(times: number[], start: number, end: number, trackPx: number) {
    const span = Math.max(end - start, 1)
    const width = EVENT_BAR_PX / Math.max(trackPx, 1)
    const buckets = new Map<number, { count: number; first: number; last: number }>()
    for (const time of [...times].sort((a, b) => a - b)) {
        if (time < start || time > end) continue
        const i = Math.min(Math.floor((time - start) / span / width), Math.floor(1 / width)) // the end itself goes in the last slice
        const b = buckets.get(i)
        if (b) {
            b.count++
            b.last = time // sorted, so the latest so far
        } else buckets.set(i, { count: 1, first: time, last: time })
    }
    const bars = [...buckets].map(([i, b]) => ({ at: i * width, width, ...b }))
    return { bars, max: Math.max(1, ...bars.map((b) => b.count)) }
}
