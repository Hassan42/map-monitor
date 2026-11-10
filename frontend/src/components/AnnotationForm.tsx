import { useState } from 'react'
import type { SubmitEvent } from 'react'
import type { Annotation, AnnotationKind, Faction, Layer } from '../types/types'
import { ANNOTATION_KINDS, ANNOTATION_KIND_LIST } from '../map/annotationKinds'
import type { AnnotationFormValues } from './annotationFormValues'
import LayerSelect from './LayerSelect'
import { formOverlayClass, formClass, formTitleClass, formFieldClass, formInputClass, formColorInputClass, formPrimaryButtonClass, formSecondaryButtonClass, formErrorClass } from '../styles/formStyles'

// the one annotation form, for a newly placed annotation or drawn line and for editing one (right-click > Edit).
// It starts from `initial` when it opens; render it with a key per annotation so another one starts fresh
function AnnotationForm({
  heading,
  submitLabel,
  initial,
  isLine = false,
  factions,
  layers,
  onSubmit,
  onCancel,
}: {
  heading: string
  submitLabel: string
  initial: AnnotationFormValues
  isLine?: boolean // a drawn line: picks its look (straight or dashed) instead of a kind
  factions: Faction[]
  layers: Layer[]
  // the form's fields as sent to the backend: times as ISO strings, null for no start / no end
  onSubmit: (fields: Pick<Annotation, 'kind' | 'dashed' | 'arrow' | 'label' | 'factionId' | 'layerId' | 'color' | 'startTime' | 'endTime'>) => Promise<void>
  onCancel: () => void
}) {
  const [kind, setKind] = useState(initial.kind)
  const [dashed, setDashed] = useState(initial.dashed)
  const [label, setLabel] = useState(initial.label)
  const [factionId, setFactionId] = useState(initial.factionId)
  const [layerId, setLayerId] = useState(initial.layerId)
  const [color, setColor] = useState(initial.color)
  const [startTime, setStartTime] = useState(initial.startTime)
  const [ongoing, setOngoing] = useState(initial.ongoing)
  const [endTime, setEndTime] = useState(initial.endTime)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    const startMs = startTime === '' ? null : new Date(startTime).getTime()
    const endMs = ongoing ? null : new Date(endTime).getTime()
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) return setError('Pick a valid date')
    if (startMs !== null && endMs !== null && endMs < startMs) return setError("The end can't be before the start")
    setError('')
    setLoading(true)
    try {
      await onSubmit({
        kind,
        dashed: isLine ? dashed : null,
        arrow: isLine ? initial.arrow : null, // set by the tool it was drawn with (Arrow or a line)
        label: label.trim() || null,
        factionId: factionId === '' ? null : factionId,
        layerId,
        color,
        startTime: startMs === null ? null : new Date(startMs).toISOString(),
        endTime: endMs === null ? null : new Date(endMs).toISOString(),
      })
    } catch {
      setError('Could not save annotation')
      setLoading(false)
    }
  }

  return (
    <div className={formOverlayClass}>
      <form onSubmit={handleSubmit} className={formClass}>
        <h2 className={formTitleClass}>{heading}</h2>

        {isLine ? (
        <div className={formFieldClass}>
          <label htmlFor="annotation-line-style">Line:</label>
          <div className="flex items-center gap-3">
            {/* preview of the chosen look in the chosen color */}
            <span aria-hidden="true" className="w-10 shrink-0" style={{ borderTop: `3px ${dashed ? 'dashed' : 'solid'} ${color}` }} />
            <select
              id="annotation-line-style"
              value={dashed ? 'dashed' : 'straight'}
              onChange={(e) => setDashed(e.target.value === 'dashed')}
              className={`${formInputClass} flex-1`}
            >
              <option value="straight">Straight</option>
              <option value="dashed">Dashed</option>
            </select>
          </div>
        </div>
        ) : (
        <div className={formFieldClass}>
          <label htmlFor="annotation-kind">Type:</label>
          <div className="flex items-center gap-3">
            {/* preview of the chosen icon in the chosen color: the svg is used as a mask over the color.
                the url must be quoted - Vite inlines small svgs as data: urls containing quotes and spaces */}
            <span
              aria-hidden="true"
              className="h-10 w-10 shrink-0"
              style={{
                backgroundColor: color,
                mask: `url("${ANNOTATION_KINDS[kind].icon}") center / contain no-repeat`,
              }}
            />
            <select
              id="annotation-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as AnnotationKind)}
              className={`${formInputClass} flex-1`}
            >
              {ANNOTATION_KIND_LIST.map((k) => (
                <option key={k} value={k}>{ANNOTATION_KINDS[k].label}</option>
              ))}
            </select>
          </div>
        </div>
        )}

        <div className={formFieldClass}>
          <label htmlFor="annotation-label">Label (optional):</label>
          <input type="text" id="annotation-label" value={label} onChange={(e) => setLabel(e.target.value)} className={formInputClass} />
        </div>

        <div className={formFieldClass}>
          <label htmlFor="annotation-faction">Actor (optional):</label>
          <select
            id="annotation-faction"
            value={factionId}
            onChange={(e) => {
              const id = e.target.value === '' ? '' : Number(e.target.value)
              setFactionId(id)
              // start from the faction's color; the color can still be changed after
              const faction = factions.find((f) => f.id === id)
              if (faction) setColor(faction.color)
            }}
            className={formInputClass}
          >
            <option value="">None</option>
            {factions.map((faction) => (
              <option key={faction.id} value={faction.id}>{faction.name}</option>
            ))}
          </select>
        </div>

        <LayerSelect id="annotation-layer" layers={layers} value={layerId} onChange={setLayerId} />

        <div className={formFieldClass}>
          <label htmlFor="annotation-start">Start (optional):</label>
          {/* a filled-in datetime field is fiddly to empty, so Clear does it in one click */}
          <div className="flex gap-2">
            <input
              type="datetime-local"
              id="annotation-start"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={`${formInputClass} flex-1`}
            />
            {startTime !== '' && (
              <button type="button" onClick={() => setStartTime('')} className={formSecondaryButtonClass}>Clear</button>
            )}
          </div>
          {startTime === '' && <span className="text-xs text-gray-500">Empty: it has always been there</span>}
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
          <label htmlFor="annotation-end" className={ongoing ? 'text-gray-500' : ''}>End date:</label>
          {/* disabled rather than hidden while ongoing, so the form doesn't jump */}
          <input
            type="datetime-local"
            id="annotation-end"
            value={endTime}
            disabled={ongoing}
            onChange={(e) => setEndTime(e.target.value)}
            className={`${formInputClass} disabled:cursor-not-allowed disabled:opacity-40`}
          />
        </div>

        <div className={formFieldClass}>
          <label htmlFor="annotation-color">Color:</label>
          <input type="color" id="annotation-color" value={color} onChange={(e) => setColor(e.target.value)} className={formColorInputClass} />
        </div>

        {error && <p className={formErrorClass}>{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className={formPrimaryButtonClass}>
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

export default AnnotationForm
