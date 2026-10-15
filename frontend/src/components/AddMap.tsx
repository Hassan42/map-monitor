import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { createUserMap } from '../api/map'
import type { MapSummary } from '../types/types'
import { formOverlayClass, formClass, formTitleClass, formFieldClass, formInputClass, formPrimaryButtonClass, formSecondaryButtonClass, formErrorClass } from '../styles/formStyles'

function AddMap({ onCreated, onClose }: { onCreated: (map: MapSummary) => void; onClose: () => void }) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const map = await createUserMap({ title, description })
            onCreated(map)
            setTitle('')
            setDescription('')
        } catch {
            setError('Could not create map')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={formOverlayClass}>
            <form onSubmit={handleSubmit} className={formClass}>
                <h2 className={formTitleClass}>New Map</h2>
                <div className={formFieldClass}>
                    <label htmlFor="title">Title:</label>
                    <input type="text" id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} className={formInputClass} />
                </div>
                <div className={formFieldClass}>
                    <label htmlFor="desc">Description:</label>
                    <input type="text" id="desc" name="desc" value={description} onChange={(e) => setDescription(e.target.value)} className={formInputClass} />
                </div>
                {error && <p className={formErrorClass}>{error}</p>}
                <div className="flex gap-2">
                    <button type="submit" disabled={loading} className={formPrimaryButtonClass}>
                        {loading ? 'Adding...' : 'Add Map'}
                    </button>
                    <button type="button" onClick={onClose} className={formSecondaryButtonClass}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    )
}

export default AddMap
