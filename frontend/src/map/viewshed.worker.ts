import { computeViewshed, type ViewshedRequest } from './viewshed'

// runs the viewshed off the main thread so the map stays responsive while it calculates.
// Messages: in { id, request }, out { id, result } or { id, error }; the id lets the page drop
// answers to requests it has already replaced
export type ViewshedWorkerMessage = { id: number; request: ViewshedRequest }

// the project's TypeScript lib is DOM (not WebWorker), so the worker scope is typed by hand
const worker = self as unknown as {
  onmessage: (e: MessageEvent<ViewshedWorkerMessage>) => void
  postMessage: (message: unknown, transfer?: Transferable[]) => void
}

worker.onmessage = async (e) => {
  const { id, request } = e.data
  try {
    const result = await computeViewshed(request)
    worker.postMessage({ id, result }, [result.pixels.buffer]) // hand the mask over without copying
  } catch (error) {
    worker.postMessage({ id, error: error instanceof Error ? error.message : String(error) })
  }
}
