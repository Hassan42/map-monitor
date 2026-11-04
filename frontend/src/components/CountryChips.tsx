import { countryName } from '../map/countries'

// a map's countries as chips, by full name. `limit`: show that many, then "+2" with all of them in the
// tooltip. `onRemove`: each chip gets an x (the picker)
function CountryChips({ codes, limit, onRemove }: { codes: string[]; limit?: number; onRemove?: (code: string) => void }) {
  if (codes.length === 0) return null
  const shown = limit === undefined ? codes : codes.slice(0, limit)
  const hidden = codes.length - shown.length

  return (
    <ul className="flex flex-wrap gap-1" title={hidden > 0 ? codes.map(countryName).join(', ') : undefined}>
      {shown.map((code) => (
        <li key={code} className="flex items-center gap-1 bg-neutral-800 px-2 py-0.5 text-xs text-gray-300 ring-1 ring-white/10">
          {countryName(code)}
          {onRemove && (
            <button
              type="button"
              aria-label={`Remove ${countryName(code)}`}
              onClick={() => onRemove(code)}
              className="leading-none text-gray-500 hover:text-white"
            >
              ×
            </button>
          )}
        </li>
      ))}
      {hidden > 0 && <li className="px-1 py-0.5 text-xs text-gray-500">+{hidden}</li>}
    </ul>
  )
}

export default CountryChips
