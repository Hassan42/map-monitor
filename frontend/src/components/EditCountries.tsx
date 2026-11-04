import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { changeCountries } from '../api/map'
import type { MapSummary } from '../types/types'
import { formOverlayClass, formClass, formTitleClass, formFieldClass, formPrimaryButtonClass, formSecondaryButtonClass, formErrorClass } from '../styles/formStyles'
import CountryPicker from './CountryPicker'

// a map's country tags, from its card on the maps list. They apply right away: no draft or publish
function EditCountries({ map, onSaved, onClose }: { map: MapSummary; onSaved: (countries: string[]) => void; onClose: () => void }) {
  const [countries, setCountries] = useState(map.countries)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      onSaved(await changeCountries(map.id, countries))
    } catch {
      setError('Could not save countries')
      setSaving(false)
    }
  }

  return (
    <div className={formOverlayClass}>
      <form onSubmit={handleSubmit} className={formClass}>
        <h2 className={formTitleClass}>Countries in "{map.title}"</h2>
        <div className={formFieldClass}>
          <label htmlFor="map-countries">Countries:</label>
          <CountryPicker id="map-countries" value={countries} onChange={setCountries} />
        </div>
        {error && <p className={formErrorClass}>{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className={formPrimaryButtonClass}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={onClose} className={formSecondaryButtonClass}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default EditCountries
