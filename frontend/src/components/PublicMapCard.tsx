import { Link } from 'react-router'
import type { MapSummary } from '../types/types'
import CountryChips from './CountryChips'

// a public map in a list: the whole card opens it
function PublicMapCard({ map }: { map: MapSummary }) {
    return (
        <li className="group bg-neutral-900 ring-1 ring-white/10 transition-colors hover:ring-accent-400">
            <Link to={`/maps/${map.id}`} className="flex h-full flex-col gap-2 p-4">
                <h2 className="truncate font-semibold text-white group-hover:text-accent-300">{map.title}</h2>
                <p className="line-clamp-3 text-sm text-gray-400">
                    {map.description || <span className="italic text-gray-600">No description</span>}
                </p>
                <CountryChips codes={map.countries} limit={3} />
            </Link>
        </li>
    )
}

export default PublicMapCard
