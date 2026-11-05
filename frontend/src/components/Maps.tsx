import { useEffect, useState } from 'react'
import { getUserMaps, deleteUserMap, changeVisibility } from '../api/map'
import type { MapSummary, MapVisibility } from '../types/types'
import AddMap from './AddMap'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../store/AuthContext'
import { navButtonClass } from '../styles/navStyles'
import NavIcon from './NavIcon'
import publicIcon from '../assets/icons/visibility-public.svg'
import privateIcon from '../assets/icons/visibility-private.svg'
import AppLogo from './AppLogo'
import ConfirmDialog from './ConfirmDialog'
import CountryChips from './CountryChips'
import EditCountries from './EditCountries'

function Maps() {
    const [maps, setMaps] = useState<MapSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showAddMap, setShowAddMap] = useState(false)
    // the map whose public/private switch is waiting for a yes
    const [visibilityMap, setVisibilityMap] = useState<MapSummary | null>(null)
    // the map whose country tags are being edited
    const [countriesMap, setCountriesMap] = useState<MapSummary | null>(null)
    const navigate = useNavigate()
    const { username, signOut } = useAuth()

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

    // flips public <-> private once confirmed, then updates the list in place (the maps are only fetched once)
    const handleVisibility = (map: MapSummary) => {
        const next: MapVisibility = map.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC'
        setVisibilityMap(null)
        changeVisibility(map.id, next)
            .then(() => setMaps((prev) => prev.map((m) => (m.id === map.id ? { ...m, visibility: next } : m))))
            .catch(() => setError('Could not change map visibility'))
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-gray-300">
            {/* same bar as the map view */}
            <nav className="sticky top-0 z-50 h-14 flex items-center gap-2 bg-neutral-900 px-3 select-none">
                <span className="px-2"><AppLogo /></span>
                <span className="px-2 text-sm">{username}</span>
                <Link to="/explore" className={`${navButtonClass} ml-auto`}>
                    Explore
                </Link>
                <button type="button" onClick={() => setShowAddMap(true)} className={navButtonClass}>
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
                            className="bg-accent-400 px-4 py-2 font-medium text-neutral-900 transition-colors hover:bg-accent-300"
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
                                className="group flex flex-col bg-neutral-900 ring-1 ring-white/10 transition-colors hover:ring-accent-400"
                            >
                                {/* the whole card body opens the map */}
                                <button
                                    type="button"
                                    onClick={() => handleOpen(map.id)}
                                    className="flex flex-1 flex-col gap-2 p-4 text-left"
                                >
                                    <h3 className="truncate font-semibold text-white group-hover:text-accent-300">{map.title}</h3>
                                    <p className="line-clamp-3 text-sm text-gray-400">
                                        {map.description || <span className="italic text-gray-600">No description</span>}
                                    </p>
                                    <CountryChips codes={map.countries} limit={3} />
                                </button>

                                <div className="flex border-t border-neutral-800 text-sm">
                                    <button
                                        type="button"
                                        onClick={() => handleOpen(map.id)}
                                        className="flex-1 px-4 py-2 text-left transition-colors hover:bg-accent-400/15 hover:text-accent-300"
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
                                    <button
                                        type="button"
                                        onClick={() => setCountriesMap(map)}
                                        className="px-4 py-2 text-gray-500 transition-colors hover:bg-accent-400/15 hover:text-accent-300"
                                    >
                                        Tags
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setVisibilityMap(map)}
                                        // open eye = public, closed eye = private; the title says which and what a click does
                                        aria-label={map.visibility === 'PUBLIC' ? 'Public - make private' : 'Private - make public'}
                                        title={map.visibility === 'PUBLIC' ? 'Public - click to make private' : 'Private - click to make public'}
                                        className={`flex items-center gap-2 px-3 py-2 transition-colors ${map.visibility === 'PUBLIC' ? 'text-green-400 hover:bg-green-500/15' : 'text-gray-400 hover:bg-blue-500/15 hover:text-blue-400'}`}
                                    >
                                        <NavIcon src={map.visibility === 'PUBLIC' ? publicIcon : privateIcon} />
                                        <span className="font-mono text-[11px] font-semibold uppercase tracking-widest">
                                            {map.visibility === 'PUBLIC' ? 'Public' : 'Private'}
                                        </span>
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </main>

            {showAddMap && <AddMap onCreated={handleCreated} onClose={() => setShowAddMap(false)} />}
            {countriesMap && (
                <EditCountries
                    map={countriesMap}
                    onSaved={(countries) => {
                        setMaps((prev) => prev.map((m) => (m.id === countriesMap.id ? { ...m, countries } : m)))
                        setCountriesMap(null)
                    }}
                    onClose={() => setCountriesMap(null)}
                />
            )}
            {visibilityMap && (
                visibilityMap.visibility === 'PUBLIC' ? (
                    <ConfirmDialog
                        title={`Make "${visibilityMap.title}" private?`}
                        message="Only you will be able to see it. Anyone who has the link loses access."
                        confirmLabel="Make private"
                        danger={false}
                        onConfirm={() => handleVisibility(visibilityMap)}
                        onCancel={() => setVisibilityMap(null)}
                    />
                ) : (
                    <ConfirmDialog
                        title={`Make "${visibilityMap.title}" public?`}
                        message="Anyone with the link can view its published version, and others can import its layers (with credit to you). Your drafts stay private."
                        confirmLabel="Make public"
                        danger={false}
                        onConfirm={() => handleVisibility(visibilityMap)}
                        onCancel={() => setVisibilityMap(null)}
                    />
                )
            )}
        </div>
    )
}

export default Maps
