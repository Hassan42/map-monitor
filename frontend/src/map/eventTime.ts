import type { EventMarker } from '../types/types'

export const DAY_MS = 24 * 60 * 60 * 1000
export const DEFAULT_VISIBLE_DAYS = 7
const MIN_OPACITY = 0.3 // faintest an event gets before it disappears, so it stays readable

// the backend stores UTC but sends times without a zone ("2026-10-24T12:00:00"), which the browser
// would read as local time - mark them as UTC first
export function parseServerTime(time: string): number {
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(time)
  return new Date(hasZone ? time : `${time}Z`).getTime()
}

// whether something with an optional start and end is on the map at `time`: no start = it has always
// been there, no end = still there
export function activeAt(item: { startTime?: string | null; endTime?: string | null }, time: number): boolean {
  return (item.startTime == null || parseServerTime(item.startTime) <= time) &&
    (item.endTime == null || time < parseServerTime(item.endTime))
}

// how visible an event is at `now` (the map's date, ms): 1 = solid, lower = fading, null = hidden.
// Ongoing events stay solid; others stay solid until they end, then fade out over visibleDays
export function eventOpacity(event: EventMarker, now: number): number | null {
  const start = parseServerTime(event.timestamp)
  if (start > now) return null // hadn't happened yet at this date
  if (event.ongoing) return 1

  const end = event.endTime ? parseServerTime(event.endTime) : start // a moment ends when it starts
  if (now < end) return 1 // still running

  const window = (event.visibleDays ?? DEFAULT_VISIBLE_DAYS) * DAY_MS
  const left = end + window - now
  if (left <= 0) return null // more than visibleDays after the end
  return Math.max(MIN_OPACITY, left / window)
}
