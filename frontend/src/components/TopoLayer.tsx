import { useEffect } from 'react'
import { useMap } from '../store/MapContext'
import { addTopoLayer, removeTopoLayer, setTopoVisible } from '../map/topoLayer'


function TopoLayer({ visible }: { visible: boolean }) {
    const map = useMap()

    useEffect(() => {
        if (!map) return

        addTopoLayer(map)
        return () => {
            removeTopoLayer(map)
        }
    }, [map])

    // runs after the effect above in the same render, so the layer exists by then
    useEffect(() => {
        if (map) setTopoVisible(map, visible)
    }, [map, visible])

    return null
}

export default TopoLayer
