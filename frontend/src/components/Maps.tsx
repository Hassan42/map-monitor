import { useEffect, useState } from 'react'
import { getUserMaps, deleteUserMap } from '../api/map'
import type { MapSummary } from '../types/types'
import AddMap from './AddMap'
import { useNavigate } from 'react-router'
import { useAuth } from '../store/AuthContext'
import { navButtonClass } from '../styles/navStyles'

function Maps() {
    const [maps, setMaps] = useState<MapSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showAddMap, setShowAddMap] = useState(false)
    const navigate = useNavigate()
    const { signOut } = useAuth()

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

    const handleOpen = (mapId: string) => {
        navigate(`/maps/${mapId}`, { replace: true })
    }

    // deleting removes the map and all its versions on the backend, so ask first
    const handleDelete = (map: MapSummary) => {
        if (!window.confirm(`Delete "${map.title}"? This can't be undone.`)) return
        deleteUserMap(map.id)
            .then(() => {
                setMaps((prev) => prev.filter((m) => m.id !== map.id))
            })
            .catch(() => setError('Could not delete map'))
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-gray-300">
            {/* same bar as the map view */}
            <nav className="sticky top-0 z-50 h-14 flex items-center gap-2 bg-neutral-900 px-3 select-none">
                <span className="px-2 font-mono text-sm font-bold uppercase tracking-widest text-amber-300">Map Monitor</span>
                <button type="button" onClick={() => setShowAddMap(true)} className={`${navButtonClass} ml-auto`}>
                    + New Map
                </button>
                <button type="button" onClick={signOut} className={navButtonClass}>
                    Sign Out
                </button>
            </nav>

            <main className="mx-auto max-w-6xl p-6">
                <div className="mb-6 flex items-baseline gap-3 border-b border-neutral-800 pb-3">
                    <h1 className="text-xl font-semibold text-white">Your Maps</h1>
                    {!loading && !error && <span className="text-sm text-gray-500">({maps.length})</span>}
                </div>

                {loading && <p className="text-gray-500">Loading maps...</p>}
                {error && <p className="text-red-400">{error}</p>}

                {!loading && !error && maps.length === 0 && (
                    <div className="flex flex-col items-center gap-4 border border-dashed border-neutral-700 py-16 text-center">
                        <p className="text-gray-400">No maps yet.</p>
                        <button
                            type="button"
                            onClick={() => setShowAddMap(true)}
                            className="bg-amber-400 px-4 py-2 font-medium text-neutral-900 transition-colors hover:bg-amber-300"
                        >
                            Create your first map
                        </button>
                    </div>
                )}

                {!loading && !error && maps.length > 0 && (
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {maps.map((map) => (
                            <li
                                key={map.id}
                                className="group flex flex-col bg-neutral-900 ring-1 ring-white/10 transition-colors hover:ring-amber-400"
                            >
                                {/* the whole card body opens the map */}
                                <button
                                    type="button"
                                    onClick={() => handleOpen(map.id)}
                                    className="flex flex-1 flex-col gap-2 p-4 text-left"
                                >
                                    <h3 className="truncate font-semibold text-white group-hover:text-amber-300">{map.title}</h3>
                                    <p className="line-clamp-3 text-sm text-gray-400">
                                        {map.description || <span className="italic text-gray-600">No description</span>}
                                    </p>
                                </button>

                                <div className="flex border-t border-neutral-800 text-sm">
                                    <button
                                        type="button"
                                        onClick={() => handleOpen(map.id)}
                                        className="flex-1 px-4 py-2 text-left transition-colors hover:bg-amber-400/15 hover:text-amber-300"
                                    >
                                        Open →
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(map)}
                                        className="px-4 py-2 text-gray-500 transition-colors hover:bg-red-500/15 hover:text-red-400"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </main>

            {showAddMap && <AddMap onCreated={handleCreated} onClose={() => setShowAddMap(false)} />}
        </div>
    )
}

export default Maps
