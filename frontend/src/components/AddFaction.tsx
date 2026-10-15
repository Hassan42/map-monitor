import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { createFaction } from '../api/faction'
import type { Faction } from '../types/types'
import { formOverlayClass, formClass, formTitleClass, formFieldClass, formInputClass, formColorInputClass, formPrimaryButtonClass, formSecondaryButtonClass, formErrorClass } from '../styles/formStyles'

function AddFaction({ mapId, onCreated, onClose }: { mapId: string; onCreated: (faction: Faction) => void; onClose: () => void }) {
    const [name, setName] = useState('')
    const [color, setColor] = useState('#ff0000')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const faction = await createFaction(mapId, { name, color })
            onCreated(faction)
        } catch {
            setError('Could not create faction')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={formOverlayClass}>
            <form onSubmit={handleSubmit} className={formClass}>
                <h2 className={formTitleClass}>New Faction</h2>
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
                        {loading ? 'Adding...' : 'Add Faction'}
                    </button>
                    <button type="button" onClick={onClose} className={formSecondaryButtonClass}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    )
}

export default AddFaction
