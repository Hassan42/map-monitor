import { useState } from 'react'
import type { SubmitEvent } from 'react'
import type { Faction, Layer } from '../types/types'
import { toLocalInput } from './eventFormValues'
import LayerSelect from './LayerSelect'
import { formOverlayClass, formClass, formTitleClass, formFieldClass, formInputClass, formColorInputClass, formPrimaryButtonClass, formSecondaryButtonClass, formErrorClass } from '../styles/formStyles'

// what the form edits; the shape itself is drawn on the map
export interface TerritoryFormValues {
  name: string
  factionId: number | ''
  layerId: number | null
  color: string
  createdAt: string // datetime-local value; '' = no start date ("always"), only allowed when not required
  ongoing: boolean
  endTime: string // datetime-local value
}

// the one territory form, used for a newly drawn territory and for editing one (right-click > Edit).
// It starts from `initial` when it opens; render it with a key per territory so another one starts fresh
function TerritoryForm({
  heading,
  submitLabel,
  initial,
  factions,
  layers,
  requireCreated = true,
  maxCreated,
  factionFrom,
  severalOwners = false,
  onSubmit,
  onCancel,
}: {
  heading: string
  submitLabel: string
  initial: TerritoryFormValues
  factions: Faction[]
  layers: Layer[]
  requireCreated?: boolean
  maxCreated: { time: number; message: string } // the latest allowed creation, and why
  // editing only: the date a faction change can start from (null: no date to offer, it's undated). Left
  // out for a new territory, which has no period yet
  factionFrom?: number | null
  severalOwners?: boolean // its faction changes over time: "whole period" would replace them all
  // createdMs is null for "always"; endMs is null while ongoing; wholePeriod: the faction and color apply
  // to every date, otherwise from factionFrom until the next change
  onSubmit: (values: TerritoryFormValues & { factionId: number }, createdMs: number | null, endMs: number | null, wholePeriod: boolean) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial.name)
  const [factionId, setFactionId] = useState<number | ''>(initial.factionId)
  const [layerId, setLayerId] = useState<number | null>(initial.layerId)
  const [color, setColor] = useState(initial.color)
  // never ticked by default on a territory that changes hands, so a save can't wipe that out by accident
  const [wholePeriod, setWholePeriod] = useState(!severalOwners || factionFrom == null)
  const [createdAt, setCreatedAt] = useState(initial.createdAt)
  const [ongoing, setOngoing] = useState(initial.ongoing)
  const [endTime, setEndTime] = useState(initial.endTime)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    if (factionId === '') return setError('Pick a faction')
    const createdMs = createdAt === '' ? null : new Date(createdAt).getTime()
    const endMs = new Date(endTime).getTime()
    if ((createdMs === null && requireCreated) || Number.isNaN(createdMs)) return setError('Pick when it was created')
    if (createdMs !== null && createdMs > maxCreated.time) return setError(maxCreated.message)
    if (!ongoing) {
      if (Number.isNaN(endMs) || (createdMs !== null && endMs < createdMs)) return setError("The end can't be before the creation")
    }
    setError('')
    setLoading(true)
    try {
      await onSubmit({ name, factionId, layerId, color, createdAt, ongoing, endTime }, createdMs, ongoing ? null : endMs, wholePeriod)
    } catch {
      setError('Could not save territory')
      setLoading(false)
    }
  }

  return (
    <div className={formOverlayClass}>
      <form onSubmit={handleSubmit} className={formClass}>
        <h2 className={formTitleClass}>{heading}</h2>
        <div className={formFieldClass}>
          <label htmlFor="territory-name">Title:</label>
          <input type="text" id="territory-name" value={name} onChange={(e) => setName(e.target.value)} className={formInputClass} />
        </div>
        <div className={formFieldClass}>
          <label htmlFor="territory-faction">Faction:</label>
          {factions.length === 0 ? (
            <p className={formErrorClass}>Create a faction first.</p>
          ) : (
            <select
              id="territory-faction"
              value={factionId}
              onChange={(e) => {
                const id = Number(e.target.value)
                setFactionId(id)
                // start from the faction's color; the color can still be changed after
                const faction = factions.find((f) => f.id === id)
                if (faction) setColor(faction.color)
              }}
              className={formInputClass}
            >
              <option value="" disabled>Select a faction</option>
              {factions.map((faction) => (
                <option key={faction.id} value={faction.id}>{faction.name}</option>
              ))}
            </select>
          )}
          {factionFrom !== undefined && (
            <>
              <label className="mt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={wholePeriod}
                  disabled={factionFrom === null}
                  onChange={(e) => setWholePeriod(e.target.checked)}
                  className="accent-accent-400 disabled:opacity-40"
                />
                Whole period
              </label>
              {!wholePeriod && factionFrom !== null && (
                <span className="text-xs text-gray-500">
                  From {new Date(factionFrom).toLocaleDateString(undefined, { dateStyle: 'medium' })}, until its next change
                </span>
              )}
              {wholePeriod && severalOwners && <span className="text-xs text-amber-400">Replaces every faction it has had, on all dates</span>}
            </>
          )}
        </div>
        <LayerSelect id="territory-layer" layers={layers} value={layerId} onChange={setLayerId} />
        <div className={formFieldClass}>
          <label htmlFor="territory-created">Created{requireCreated ? "" : " (optional)"}:</label>
          {/* a filled-in datetime field is fiddly to empty, so Clear does it in one click */}
          <div className="flex gap-2">
            <input
              type="datetime-local"
              id="territory-created"
              value={createdAt}
              max={toLocalInput(maxCreated.time)}
              onChange={(e) => setCreatedAt(e.target.value)}
              className={`${formInputClass} flex-1`}
            />
            {!requireCreated && createdAt !== '' && (
              <button type="button" onClick={() => setCreatedAt('')} className={formSecondaryButtonClass}>Clear</button>
            )}
          </div>
          {!requireCreated && createdAt === '' && <span className="text-xs text-gray-500">Empty: it has always been there</span>}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={ongoing}
            onChange={(e) => setOngoing(e.target.checked)}
            className="accent-accent-400"
          />
          Ongoing (no end yet)
        </label>
        <div className={formFieldClass}>
          <label htmlFor="territory-end" className={ongoing ? 'text-gray-500' : ''}>End date:</label>
          {/* disabled rather than hidden while ongoing, so the form doesn't jump */}
          <input
            type="datetime-local"
            id="territory-end"
            value={endTime}
            disabled={ongoing}
            onChange={(e) => setEndTime(e.target.value)}
            className={`${formInputClass} disabled:cursor-not-allowed disabled:opacity-40`}
          />
        </div>
        <div className={formFieldClass}>
          <label htmlFor="territory-color">Color:</label>
          <input type="color" id="territory-color" value={color} onChange={(e) => setColor(e.target.value)} className={formColorInputClass} />
        </div>
        {error && <p className={formErrorClass}>{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={loading || factions.length === 0} className={formPrimaryButtonClass}>
            {loading ? 'Saving...' : submitLabel}
          </button>
          <button type="button" onClick={onCancel} className={formSecondaryButtonClass}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default TerritoryForm
