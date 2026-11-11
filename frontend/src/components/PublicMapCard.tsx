import { Link } from 'react-router'
import type { MapSummary } from '../types/types'
import CountryChips from './CountryChips'
import { monitorMap } from '../api/user'
import {getMonitorsCount} from '../api/map'
import type { Monitors } from '../api/map'
import { useEffect, useState } from 'react'
import { formErrorClass } from '../styles/formStyles'
import NavIcon from './NavIcon'
import { useAuth } from '../store/AuthContext'
import eyeIcon from '../assets/icons/visibility-public.svg'

// a public map in a list: the whole card opens it
function PublicMapCard({ map }: { map: MapSummary }) {
    const { user } = useAuth() // visitors can't monitor, so they don't get the button
    const [monitors, setMonitors] = useState<Monitors>();
    const [error, setError] = useState<string>();

    useEffect(() => {
        getMonitorsCount(map.id).then( 
            setMonitors
        )
    }, [map.id])

    const onMonitor = (mapId: number) => {
        monitorMap(mapId).then(
            (result) => {
                setMonitors(result)
            }
        ).catch(() => setError("Couldn't monitor this map."))
    }


    return (
        <li className="group bg-neutral-900 ring-1 ring-white/10 transition-colors hover:ring-accent-400 flex h-full flex-col gap-2 p-4">
            <Link to={`/maps/${map.id}`} className="flex flex-1 flex-col gap-2">
                <h2 className="truncate font-semibold text-white group-hover:text-accent-300">{map.title}</h2>
                {/* always 3 lines tall, so every card is the same height */}
                <p className="line-clamp-3 h-[3lh] text-sm text-gray-400">
                    {map.description || <span className="italic text-gray-600">No description</span>}
                </p>
                <CountryChips codes={map.countries} limit={3} />
                      </Link>
                <div className="flex border-t border-neutral-800 text-sm">
                    {user && (
                        <button
                            type="button"
                            onClick={() => onMonitor(Number(map.id))}
                            disabled={monitors?.monitoredByMe}
                            className="flex-1 px-4 py-2 text-left transition-colors hover:bg-accent-400/15 hover:text-accent-300 disabled:cursor-default disabled:text-gray-500 disabled:hover:bg-transparent"
                        >
                            {monitors?.monitoredByMe ? 'Monitoring' : '+ Monitor'}
                        </button>
                    )}
                    {monitors && (
                        <span className="flex items-center gap-1.5 px-4 py-2 text-gray-400" title="Users monitoring this map">
                            <NavIcon src={eyeIcon} className="!h-4 !w-4" />
                            {monitors.count}
                        </span>
                    )}
                    {error && <p className={formErrorClass}>{error}</p>}
                </div>
      
        </li>
    )
}

export default PublicMapCard
