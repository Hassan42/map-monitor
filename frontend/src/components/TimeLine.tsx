import { useEffect, useState } from "react"
import type { ChangeEvent } from "react"
import { DAY_MS } from "../map/eventTime"

const HOUR_MS = 60 * 60 * 1000
// playback: the whole range plays in about PLAY_DURATION_MS, one step every PLAY_TICK_MS
const PLAY_DURATION_MS = 70_000
const PLAY_TICK_MS = 1000

// tick spacing that keeps the bar readable: daily for short ranges, weekly / monthly for longer ones
function tickStep(range: number) {
    if (range <= 60 * DAY_MS) return DAY_MS
    if (range <= 2 * 365 * DAY_MS) return 7 * DAY_MS
    return 30 * DAY_MS
}

// tick times from the first midnight after `min` up to `max`
function tickTimes(min: number, max: number) {
    const step = tickStep(max - min)
    const first = new Date(min)
    first.setHours(24, 0, 0, 0)
    const ticks: number[] = []
    for (let t = first.getTime(); t <= max; t += step) ticks.push(t)
    return ticks
}

// a labeled, taller tick: Mondays for daily ticks, the first tick of each month otherwise
function isMajorTick(t: number, step: number) {
    const date = new Date(t)
    return step === DAY_MS ? date.getDay() === 1 : date.getDate() <= step / DAY_MS
}

function TimeLine({
    min,
    max,
    now,
    onChange,
}: {
    min: number,
    max: number,
    now: number,
    onChange: (time: number) => void
}) {
    const range = Math.max(max - min, 1)
    const percent = (t: number) => ((t - min) / range) * 100
    const step = tickStep(range)
    const [playing, setPlaying] = useState(false)

    // playback: move the date forward one step at a time, stopping at the end of the range
    useEffect(() => {
        if (!playing) return
        const timer = setTimeout(() => {
            const next = Math.min(max, now + range / (PLAY_DURATION_MS / PLAY_TICK_MS))
            onChange(next)
            if (next >= max) setPlaying(false)
        }, PLAY_TICK_MS)
        return () => clearTimeout(timer)
    }, [playing, now, max, range, onChange])

    const togglePlay = () => {
        if (playing) return setPlaying(false)
        if (now >= max) onChange(min) // at the end: play again from the start
        setPlaying(true)
    }

    return (
        // bottom center of the map area (the property panel takes the right 18rem)
        <div className="fixed bottom-6 left-[calc((100%-18rem)/2)] z-40 flex -translate-x-1/2 items-center gap-4 bg-neutral-900 px-4 py-3 text-sm text-gray-300 shadow-xl ring-1 ring-white/10">
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

            <div className="relative h-8 w-[min(36rem,calc(100vw-30rem))]">
                {/* ticks behind the slider; major ones are taller and carry a date */}
                {tickTimes(min, max).map((t) => {
                    const major = isMajorTick(t, step)
                    return (
                        <div key={t} className="absolute top-0" style={{ left: `${percent(t)}%` }}>
                            <div className={`w-px ${major ? 'h-3 bg-gray-400' : 'h-1.5 bg-neutral-600'}`} />
                            {major && (
                                <span className="absolute top-3.5 -translate-x-1/2 whitespace-nowrap text-[10px] text-gray-500">
                                    {new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                            )}
                        </div>
                    )
                })}
                <input
                    type="range"
                    aria-label="Map date"
                    min={min}
                    max={max}
                    step={HOUR_MS}
                    value={now}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setPlaying(false) // dragging takes over from playback
                        onChange(Number(e.target.value))
                    }}
                    className="timeline-range absolute inset-x-0 top-0 w-full"
                />
            </div>

            <span className="w-36 shrink-0 text-right font-mono text-xs text-gray-200">
                {new Date(now).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
        </div>
    )
}


export default TimeLine
