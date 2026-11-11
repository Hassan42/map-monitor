import { useEffect, useState } from 'react'
import { getMonitorsCount } from '../api/map'
import NavIcon from './NavIcon'
import eyeIcon from '../assets/icons/visibility-public.svg'

// how many users monitor a map, e.g. on your own map cards
function MonitorsCount({ mapId }: { mapId: string }) {
  const [count, setCount] = useState<number>()

  useEffect(() => {
    getMonitorsCount(mapId).then((m) => setCount(m.count)).catch(() => {})
  }, [mapId])

  if (count === undefined) return null
  return (
    <span className="flex items-center gap-1.5 px-3 py-2 text-gray-400" title="Users monitoring this map">
      <NavIcon src={eyeIcon} className="!h-4 !w-4" />
      {count}
    </span>
  )
}

export default MonitorsCount
