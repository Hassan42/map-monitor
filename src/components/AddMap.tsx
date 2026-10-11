import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { createUserMap } from '../api/map'
import type { MapSummary } from '../types/types'

function AddMap({ onCreated }: { onCreated: (map: MapSummary) => void }) {
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-80">
            <div className="flex flex-col gap-1">
                <label htmlFor="title">Title:</label>
                <input type="text" id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} className="border border-gray-300 px-2 py-1 text-black" />
            </div>
            <div className="flex flex-col gap-1">
                <label htmlFor="desc">Description:</label>
                <input type="text" id="desc" name="desc" value={description} onChange={(e) => setDescription(e.target.value)} className="border border-gray-300 px-2 py-1 text-black" />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-2 py-1">
                {loading ? 'Adding...' : 'Add Map'}
            </button>
        </form>
    )
}

export default AddMap
