import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { createLayer } from '../api/layer'
import type { Layer } from '../types/types'
import { formOverlayClass, formClass, formTitleClass, formFieldClass, formInputClass, formPrimaryButtonClass, formSecondaryButtonClass, formErrorClass } from '../styles/formStyles'

function AddLayer({ mapId, onCreated, onClose }: { mapId: string; onCreated: (layer: Layer) => void; onClose: () => void }) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault()
        if (!title.trim()) return setError('Give the layer a title')
        setError('')
        setLoading(true)
        try {
            const layer = await createLayer(mapId, { title: title.trim(), description })
            onCreated(layer)
        } catch {
            setError('Could not create layer')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={formOverlayClass}>
            <form onSubmit={handleSubmit} className={formClass}>
                <h2 className={formTitleClass}>New Layer</h2>
                <div className={formFieldClass}>
                    <label htmlFor="layer-title">Title:</label>
                    <input type="text" id="layer-title" value={title} onChange={(e) => setTitle(e.target.value)} className={formInputClass} />
                </div>
                <div className={formFieldClass}>
                    <label htmlFor="layer-description">Description (optional):</label>
                    <input type="text" id="layer-description" value={description} onChange={(e) => setDescription(e.target.value)} className={formInputClass} />
                </div>
                {error && <p className={formErrorClass}>{error}</p>}
                <div className="flex gap-2">
                    <button type="submit" disabled={loading} className={formPrimaryButtonClass}>
                        {loading ? 'Adding...' : 'Add Layer'}
                    </button>
                    <button type="button" onClick={onClose} className={formSecondaryButtonClass}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    )
}

export default AddLayer
