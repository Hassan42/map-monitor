import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { createFaction, editFaction } from '../api/faction'
import type { Faction } from '../types/types'
import { formOverlayClass, formClass, formTitleClass, formFieldClass, formInputClass, formColorInputClass, formPrimaryButtonClass, formSecondaryButtonClass, formErrorClass } from '../styles/formStyles'

// adds an actor, or edits `faction` when given
function FactionForm({ mapId, faction, onSaved, onClose }: { mapId: string; faction?: Faction; onSaved: (faction: Faction) => void; onClose: () => void }) {
    const [name, setName] = useState(faction?.name ?? '')
    const [color, setColor] = useState(faction?.color ?? '#ff0000')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            onSaved(await (faction ? editFaction(mapId, faction.id, { name, color }) : createFaction(mapId, { name, color })))
        } catch {
            setError('Could not save actor')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={formOverlayClass}>
            <form onSubmit={handleSubmit} className={formClass}>
                <h2 className={formTitleClass}>{faction ? 'Edit Actor' : 'New Actor'}</h2>
                <div className={formFieldClass}>
                    <label htmlFor="name">Name:</label>
                    <input type="text" id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} className={formInputClass} />
                </div>
                <div className={formFieldClass}>
                    <label htmlFor="color">Color:</label>
                    <input type="color" id="color" name="color" value={color} onChange={(e) => setColor(e.target.value)} className={formColorInputClass} />
                </div>
                {error && <p className={formErrorClass}>{error}</p>}
                <div className="flex gap-2">
                    <button type="submit" disabled={loading} className={formPrimaryButtonClass}>
                        {loading ? 'Saving...' : faction ? 'Save' : 'Add Actor'}
                    </button>
                    <button type="button" onClick={onClose} className={formSecondaryButtonClass}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    )
}

export default FactionForm
