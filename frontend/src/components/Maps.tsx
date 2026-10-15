import { useEffect, useState } from 'react'
import { getUserMaps, deleteUserMap } from '../api/map'
import type { MapSummary } from '../types/types'
import AddMap from './AddMap'
import { useNavigate } from 'react-router'

function Maps() {
    const [maps, setMaps] = useState<MapSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showAddMap, setShowAddMap] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        getUserMaps()
            .then(setMaps)
            .catch(() => setError('Could not load maps'))
            .finally(() => setLoading(false))
    }, [])

    const handleCreated = (map: MapSummary) => {
        setMaps((prev) => [...prev, map])
        setShowAddMap(false)
    }

    const handleDelete = (mapId: string) => {
        deleteUserMap(mapId)
            .then(() => {
                setMaps((prev) => prev.filter((m) => m.id !== mapId))
            })
    }

    return (
        <div className="flex flex-col gap-4 p-4">
            <button
                type="button"
                onClick={() => setShowAddMap((prev) => !prev)}
                className="bg-blue-600 text-white px-2 py-1 self-start"
            >
                {showAddMap ? 'Cancel' : 'Add Map'}
            </button>

            {showAddMap && <AddMap onCreated={handleCreated} />}

            {loading && <p>Loading maps...</p>}
            {error && <p className="text-red-600">{error}</p>}
            {!loading && !error && (
                <div className="flex flex-row flex-wrap gap-2">
                    {maps.length === 0 && <p>No maps yet.</p>}
                    {maps.map((map) => (
                        <div key={map.id} className="border border-gray-300 p-3">
                            <h3 className="font-bold">{map.title}</h3>
                            <p>{map.description}</p>
                            <button type="button"
                                onClick={() => { navigate(`/maps/${map.id}`, { replace: true }) }}
                                className="bg-green-600 text-white px-2 py-1 self-start"
                            > View
                            </button>
                            <button type="button"
                                onClick={() => handleDelete(map.id)}
                                className="bg-red-600 text-white px-2 py-1 self-start"
                            > Delete
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default Maps
