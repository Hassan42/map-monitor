import type { Territory, TerritoryState } from '../types/types'
import { parseServerTime } from './eventTime'

// which of a territory's states holds at time `now`: an index into its history, 'current' when it
// has no history (never timed, always shown as is), or null when it didn't exist then (before its
// first state, or at/after its end)
function stateIndexAt(t: Territory, now: number): number | 'current' | null {
  if (t.endTime && parseServerTime(t.endTime) <= now) return null
  const history = t.history ?? []
  if (history.length === 0) return 'current'
  // history is sorted by `from` (the backend's @OrderBy): the last state that had started
  for (let i = history.length - 1; i >= 0; i--) {
    if (parseServerTime(history[i].from) <= now) return i
  }
  return null
}

// the territory as it was at time `now`, or null if it didn't exist then
export function territoryAt(t: Territory, now: number): Territory | null {
  const index = stateIndexAt(t, now)
  if (index === null) return null
  if (index === 'current') return t
  const state = t.history![index]
  return { ...t, points: state.points, factionId: state.factionId, color: state.color }
}

// a string saying which state every territory shows at `now`, e.g. "3:0,5:x". It only changes when
// some territory switches state, so it can stand in for `now` as a useMemo dependency
export function territoryKey(territories: Territory[], now: number): string {
  return territories.map((t) => `${t.id}:${stateIndexAt(t, now) ?? 'x'}`).join(',')
}

// the territory with `shape` holding from `now` until its next state: replaces the state that starts
// exactly at `now`, or adds a new one; later states are kept. The territory's own fields follow the
// latest state, as the backend expects
export function withShapeAt(t: Territory, shape: Omit<TerritoryState, 'from'>, now: number): Territory {
  const from = new Date(now).toISOString()
  let history = [...(t.history ?? [])]

  // a territory without history (from before timelines): keep its shape as the "always" state first,
  // so it doesn't disappear before the edit's date
  if (history.length === 0) {
    history.push({ from: new Date(0).toISOString(), points: t.points, factionId: t.factionId, color: t.color })
  }

  const same = history.findIndex((s) => parseServerTime(s.from) === now)
  if (same >= 0) history[same] = { from, ...shape } // same date: replace it
  else history.push({ from, ...shape }) // new date: add it
  history = history.sort((a, b) => parseServerTime(a.from) - parseServerTime(b.from))

  const latest = history[history.length - 1]
  return { ...t, history, points: latest.points, factionId: latest.factionId, color: latest.color }
}

// ---- carrying an edit into later shapes ----
// An edit of one state is turned into "stretches" of the outline: between two points that stayed put
// (anchors), the old run of points was replaced by a new run. A later state gets the same replacement
// only where it still has exactly that old run between the same anchors - stretches it changed itself
// are left alone, so a later shape keeps its own changes.

type Point = [number, number]
type Stretch = { before: string; after: string; oldRun: Point[]; newRun: Point[] }

const keyOf = ([x, y]: Point) => `${x.toFixed(7)},${y.toFixed(7)}` // same point = same key, despite float noise

// a polygon's outer ring without the closing point (it repeats the first)
function openRing(points: string): Point[] {
  const ring = (JSON.parse(points) as Point[][])[0] ?? []
  return ring.length > 1 && keyOf(ring[0]) === keyOf(ring[ring.length - 1]) ? ring.slice(0, -1) : ring
}
const closedPoints = (ring: Point[]) => JSON.stringify([[...ring, ring[0]]])

// the pairs (index in a, index in b) of the longest common subsequence of point keys: the points the
// edit left in place, in order
function commonPoints(a: string[], b: string[]): [number, number][] {
  const n = a.length
  const m = b.length
  const table = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }
  const pairs: [number, number][] = []
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (a[i] === b[j]) pairs.push([i++, j++])
    else if (table[i + 1][j] >= table[i][j + 1]) i++
    else j++
  }
  return pairs
}

// the stretches an edit changed, from the old and new outline
function changedStretches(oldPoints: string, newPoints: string): Stretch[] {
  const oldRing = openRing(oldPoints)
  const newRing = openRing(newPoints)
  const pairs = commonPoints(oldRing.map(keyOf), newRing.map(keyOf))
  if (pairs.length < 2) return [] // redrawn from scratch: nothing to match in later shapes

  const stretches: Stretch[] = []
  for (let k = 0; k < pairs.length; k++) {
    const [oi, ni] = pairs[k]
    const [oj, nj] = pairs[(k + 1) % pairs.length] // the last stretch wraps around the ring
    const run = (ring: Point[], from: number, to: number) => {
      const out: Point[] = []
      for (let i = (from + 1) % ring.length; i !== to; i = (i + 1) % ring.length) out.push(ring[i])
      return out
    }
    const oldRun = run(oldRing, oi, oj)
    const newRun = run(newRing, ni, nj)
    const same = oldRun.length === newRun.length && oldRun.every((p, i) => keyOf(p) === keyOf(newRun[i]))
    if (!same) stretches.push({ before: keyOf(oldRing[oi]), after: keyOf(oldRing[oj]), oldRun, newRun })
  }
  return stretches
}

// one later outline with every stretch it still has unchanged replaced; the rest stays as it is.
// Moved or deleted points (a non-empty old run) are found by the run itself; added points (an empty
// old run) need both neighbours, to know which edge they go on
function applyStretches(points: string, stretches: Stretch[]): string {
  let ring = openRing(points)
  for (const s of stretches) {
    const n = ring.length
    const at = (i: number) => keyOf(ring[(i + n) % n])
    let start = -1 // index of the run's first point (for an added point: where it goes)
    if (s.oldRun.length > 0) {
      const run = s.oldRun.map(keyOf)
      start = ring.findIndex((_, i) => run.every((key, k) => at(i + k) === key))
    } else {
      const i = ring.findIndex((p) => keyOf(p) === s.before)
      if (i >= 0 && at(i + 1) === s.after) start = (i + 1) % n
    }
    if (start < 0) continue // this later shape changed that stretch itself: leave it
    const rotated = [...ring.slice(start), ...ring.slice(0, start)] // run first, so it's contiguous
    ring = [...s.newRun, ...rotated.slice(s.oldRun.length)]
  }
  return closedPoints(ring)
}

// how many of a territory's states start after time `now` (the ones an edit at `now` doesn't reach)
export const laterStateCount = (t: Territory, now: number) =>
  (t.history ?? []).filter((s) => parseServerTime(s.from) > now).length

// the territory with an edit (oldPoints -> newPoints, made at time `now`) carried into every later state
// where the changed stretches are still unchanged. Run it after withShapeAt
export function carryEditForward(t: Territory, oldPoints: string, newPoints: string, now: number): Territory {
  const stretches = changedStretches(oldPoints, newPoints)
  if (stretches.length === 0) return t
  const history = (t.history ?? []).map((s) =>
    parseServerTime(s.from) > now ? { ...s, points: applyStretches(s.points, stretches) } : s,
  )
  const latest = history[history.length - 1]
  return { ...t, history, points: latest.points, factionId: latest.factionId, color: latest.color }
}
