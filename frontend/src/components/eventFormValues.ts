import type { EventCategory, EventMarker, EventRelation } from '../types/types'
import { DEFAULT_VISIBLE_DAYS, parseServerTime } from '../map/eventTime'

// what the form edits; the location and start time come from whoever opens the form
export interface EventFormValues {
  title: string
  description: string
  sourceURL: string
  category: EventCategory
  factionId: number | ''
  relations: EventRelation[]
  startTime: string // when it happened, a datetime-local value ("YYYY-MM-DDTHH:mm", local time)
  endTime: string // a datetime-local value
  ongoing: boolean
  visibleDays: number
}

// datetime-local inputs take local time as "YYYY-MM-DDTHH:mm"
export const toLocalInput = (time: number): string => {
  const date = new Date(time)
  return new Date(time - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

// a function, not a constant: the default end time is "now", taken when the form opens
export const emptyEventForm = (): EventFormValues => ({
  title: '',
  description: '',
  sourceURL: '',
  category: 'OTHER',
  factionId: '',
  relations: [],
  startTime: toLocalInput(Date.now()), // by default an event happens when it's created...
  endTime: toLocalInput(Date.now()), // ...and ends right away
  ongoing: false,
  visibleDays: DEFAULT_VISIBLE_DAYS,
})

export const eventToFormValues = (event: EventMarker): EventFormValues => ({
  title: event.title ?? '',
  description: event.description ?? '',
  sourceURL: event.sourceURL ?? '',
  category: event.category ?? 'OTHER',
  factionId: event.factionId,
  relations: event.relations ?? [],
  startTime: toLocalInput(parseServerTime(event.timestamp)),
  endTime: toLocalInput(parseServerTime(event.endTime ?? event.timestamp)),
  ongoing: event.ongoing ?? false,
  visibleDays: event.visibleDays ?? DEFAULT_VISIBLE_DAYS,
})

// the form's start time as epoch ms; an emptied field falls back to `fallback`. The input has no
// seconds, so a start in the current minute (the default "now") keeps the exact fallback time
export function startTimeMs(values: EventFormValues, fallback: number): number {
  const start = new Date(values.startTime).getTime()
  if (Number.isNaN(start) || (start <= fallback && fallback - start < 60_000)) return fallback
  return start
}

// the form's end time as the backend takes it (ISO, UTC); null when ongoing. The input has no
// seconds, so an end in the same minute as the start (the default "ends when created") or an
// emptied field becomes the start itself
export function endTimeForServer(values: EventFormValues, startMs: number): string | null {
  if (values.ongoing) return null
  const end = new Date(values.endTime).getTime()
  if (Number.isNaN(end) || (end < startMs && startMs - end < 60_000)) return new Date(startMs).toISOString()
  return new Date(end).toISOString()
}
