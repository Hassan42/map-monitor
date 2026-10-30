import type { Layer } from '../types/types'
import { formFieldClass, formInputClass } from '../styles/formStyles'

// the "which layer is it in" field of the event, territory and annotation forms; null = no layer
function LayerSelect({
  id,
  layers,
  value,
  onChange,
  className = '',
}: {
  id: string
  layers: Layer[]
  value: number | null
  onChange: (layerId: number | null) => void
  className?: string
}) {
  return (
    <div className={`${formFieldClass} ${className}`}>
      <label htmlFor={id}>Layer (optional):</label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className={formInputClass}
      >
        <option value="">None</option>
        {layers.map((layer) => (
          <option key={layer.id} value={layer.id}>{layer.title}</option>
        ))}
      </select>
    </div>
  )
}

export default LayerSelect
