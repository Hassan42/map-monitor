import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { COUNTRIES, MAX_COUNTRIES } from '../map/countries'
import { formInputClass } from '../styles/formStyles'
import CountryChips from './CountryChips'

// choose countries: type to search, pick from the list, the chosen ones show as chips below
function CountryPicker({ id, value, onChange }: { id: string; value: string[]; onChange: (codes: string[]) => void }) {
  const [query, setQuery] = useState('')

  const full = value.length >= MAX_COUNTRIES
  const search = query.trim().toLowerCase()
  const matches = COUNTRIES.filter((c) => !value.includes(c.code) && c.name.toLowerCase().includes(search))

  const add = (code: string) => {
    onChange([...value, code])
    setQuery('')
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return
    e.preventDefault() // not the form's submit
    if (search && matches.length > 0 && !full) add(matches[0].code)
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        id={id}
        autoComplete="off"
        value={query}
        placeholder={full ? `At most ${MAX_COUNTRIES} countries` : 'Search countries'}
        disabled={full}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className={`${formInputClass} disabled:opacity-50`}
      />
      {!full && (
        // always open and in the form's flow: the form scrolls and would clip a dropdown, and a list that
        // closed when the field loses focus would shift the buttons below it in the middle of a click
        <ul role="listbox" aria-label="Countries" className="max-h-36 overflow-y-auto bg-neutral-800 ring-1 ring-white/10">
          {matches.map((c) => (
            <li key={c.code} role="option" aria-selected={false}>
              <button type="button" onClick={() => add(c.code)} className="block w-full px-2 py-1 text-left text-sm text-gray-300 hover:bg-accent-400/15 hover:text-accent-300">
                {c.name}
              </button>
            </li>
          ))}
          {matches.length === 0 && <li className="px-2 py-1 text-sm text-gray-500">No matches</li>}
        </ul>
      )}
      <CountryChips codes={value} onRemove={(code) => onChange(value.filter((c) => c !== code))} />
    </div>
  )
}

export default CountryPicker
