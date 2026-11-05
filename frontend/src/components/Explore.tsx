import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { getPublicMaps } from '../api/map'
import { useAuth } from '../store/AuthContext'
import { navButtonClass } from '../styles/navStyles'
import type { MapSummary } from '../types/types'
import AppLogo from './AppLogo'
import CountryPicker from './CountryPicker'
import GoogleSignInButton from './GoogleSignInButton'
import PublicMapCard from './PublicMapCard'

// public maps, searched by their country tags. Open to visitors. The search lives in the URL, so it can be shared
function Explore() {
    const { user } = useAuth()

    const [params, setParams] = useSearchParams()
    const key = params.get('countries') ?? ''
    const countries = key.split(',').filter(Boolean)

    const handleCountries = (codes: string[]) => {
        setParams(codes.length > 0 ? { countries: codes.join(',') } : {})
    }

    // the answer remembers which search it's for: until it matches the URL, that search is still loading
    const [result, setResult] = useState<{ key: string; maps: MapSummary[]; error: string } | null>(null)
    const loading = result?.key !== key
    const maps = result?.maps ?? []
    const error = loading ? '' : result.error

    useEffect(() => {
        let stale = false // a newer search started: this answer no longer counts
        getPublicMaps(key.split(',').filter(Boolean))
            .then((found) => {
                if (!stale) setResult({ key, maps: found, error: '' })
            })
            .catch(() => {
                if (!stale) setResult({ key, maps: [], error: 'Could not load maps' })
            })
        return () => {
            stale = true
        }
    }, [key])

    return (
        <div className="min-h-screen bg-neutral-950 text-gray-300">
            <nav className="sticky top-0 z-50 flex h-14 items-center justify-between gap-2 bg-neutral-900 px-3 select-none">
                <span className="px-2"><AppLogo /></span>
                {user ? <Link to="/maps" className={navButtonClass}>Your Maps</Link> : <GoogleSignInButton label="Sign in" />}
            </nav>

            <main className="mx-auto max-w-6xl p-6">
                <div className="mb-6 flex items-baseline gap-3 border-b border-neutral-800 pb-3">
                    <h1 className="text-xl font-semibold text-white">Explore Maps</h1>
                    {!loading && !error && <span className="text-sm text-gray-500">({maps.length})</span>}
                </div>

                <div className="mb-6 max-w-md">
                    <CountryPicker id="explore-countries" value={countries} onChange={handleCountries} />
                </div>

                {loading && <p className="text-gray-500">Loading maps...</p>}
                {error && <p className="text-red-400">{error}</p>}

                {!loading && !error && maps.length === 0 && (
                    <p className="border border-dashed border-neutral-700 py-16 text-center text-gray-400">
                        {countries.length > 0 ? 'No public maps for these countries yet.' : 'No public maps yet.'}
                    </p>
                )}

                {!loading && !error && maps.length > 0 && (
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {maps.map((map) => (
                            <PublicMapCard key={map.id} map={map} />
                        ))}
                    </ul>
                )}
            </main>
        </div>
    )
}

export default Explore
