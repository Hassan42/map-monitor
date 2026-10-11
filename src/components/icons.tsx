// hand-drawn pixel-art icons (16x16 grid, 'X' = filled pixel) to match the old-school square theme;
// drawn in currentColor so they follow the button's text color (gray, amber on hover/active)

const CURSOR = [
    'X...............',
    'XX..............',
    'XXX.............',
    'XXXX............',
    'XXXXX...........',
    'XXXXXX..........',
    'XXXXXXX.........',
    'XXXXXXXX........',
    'XXXXXXXXX.......',
    'XXXXXX..........',
    'XXX.XXX.........',
    'XX..XXX.........',
    'X....XXX........',
    '.....XXX........',
    '......XX........',
    '................',
]

const HAND = [
    '......XX........',
    '...XX.XX.XX.....',
    '...XX.XX.XX.....',
    '...XX.XX.XX.XX..',
    '...XX.XX.XX.XX..',
    '...XX.XX.XX.XX..',
    'XX.XXXXXXXXXXX..',
    'XXXXXXXXXXXXXX..',
    '.XXXXXXXXXXXXX..',
    '..XXXXXXXXXXXX..',
    '..XXXXXXXXXXX...',
    '...XXXXXXXXXX...',
    '...XXXXXXXXX....',
    '....XXXXXXXX....',
    '....XXXXXXXX....',
    '................',
]

// one 1x1 square per filled pixel; crispEdges keeps them sharp at any size
function PixelIcon({ rows }: { rows: string[] }) {
    const d = rows
        .flatMap((row, y) => [...row].map((cell, x) => (cell === 'X' ? `M${x} ${y}h1v1h-1z` : '')))
        .join('')

    return (
        <svg viewBox="0 0 16 16" className="h-5 w-5" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
            <path d={d} />
        </svg>
    )
}

export function CursorIcon() {
    return <PixelIcon rows={CURSOR} />
}

export function HandIcon() {
    return <PixelIcon rows={HAND} />
}
