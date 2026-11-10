export interface Place {
  name: string
  detail: string                          // "Lebanon" or "Mount Lebanon, Lebanon"
  center: [number, number]                // [lng, lat]
  bounds?: [number, number, number, number] // [west, south, east, north], for areas
}

// up to 6 places matching the text; `signal` lets an older search be cancelled
export async function searchPlaces(text: string, signal: AbortSignal): Promise<Place[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=6&lang=en`
  const res = await fetch(url, { signal })
  if (!res.ok) return []
  const data = await res.json()
  return data.features.map((f: any) => {
    const p = f.properties
    return {
      name: p.name,
      detail: [p.state, p.country].filter((s) => s && s !== p.name).join(', '),
      center: f.geometry.coordinates,
      // Photon's extent is [west, north, east, south]
      bounds: p.extent ? [p.extent[0], p.extent[3], p.extent[2], p.extent[1]] : undefined,
    }
  })
}