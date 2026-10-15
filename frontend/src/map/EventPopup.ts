import type { EventMarker } from "../types/types"

export function createEventPopupContent(event: EventMarker) {
  const root = document.createElement('div')
  root.className = 'flex flex-col gap-1'

  const title = document.createElement('h3')
  title.className = 'font-semibold text-white'
  title.textContent = event.title || `Event #${event.id}`
  root.append(title)

  if (event.description) {
    const description = document.createElement('p')
    description.className = 'text-gray-300'
    description.textContent = event.description
    root.append(description)
  }

  const source = document.createElement('a')
  source.className = 'text-xs text-amber-300 hover:underline truncate'

  if (event.sourceURL) {
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