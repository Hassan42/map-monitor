import type { EventMarker } from "../types/types"
import { parseServerTime } from "./eventTime"

const formatTime = (time: number) => new Date(time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

// when the event happened: one date for a moment, start - end for a stretch, "since" while ongoing
function eventDateText(event: EventMarker): string {
  const start = parseServerTime(event.timestamp)
  if (event.ongoing) return `Since ${formatTime(start)} · ongoing`
  const end = event.endTime ? parseServerTime(event.endTime) : start
  return end > start ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start)
}

export function createEventPopupContent(event: EventMarker) {
  const root = document.createElement('div')
  root.className = 'flex flex-col gap-1'

  const title = document.createElement('h3')
  title.className = 'font-semibold text-white'
  title.textContent = event.title || `Event #${event.id}`
  root.append(title)

  const date = document.createElement('p')
  date.className = 'text-xs text-gray-400'
  date.textContent = eventDateText(event)
  root.append(date)

  if (event.description) {
    const description = document.createElement('p')
    description.className = 'text-gray-300'
    description.textContent = event.description
    root.append(description)
  }

  const source = document.createElement('a')
  source.className = 'text-xs text-accent-300 hover:underline truncate'

  // only real web links, also for values saved before the backend checked them
  if (event.sourceURL && /^https?:\/\//i.test(event.sourceURL)) {
    source.textContent = "Source"
    const arrow = document.createElement('span')
    arrow.textContent = '⇱ '
    arrow.className = 'text-base leading-none'   // bigger than the link's text-xs
    source.prepend(arrow)
    source.href = event.sourceURL
    source.target = '_blank'               // open in a new tab
    source.rel = 'noopener noreferrer'     // the opened page can't control your app's tab
  }
  else{
    source.textContent = "No Source Provided."
  }
  root.append(source)
  
  return root
}