import { useEffect, useState } from 'react'

// below Tailwind's md breakpoint (768px): the phone layout. Layout itself is done with md: / max-md:
// classes; this is only for the few places that behave differently, not just look different
export const PHONE_QUERY = '(max-width: 767px)'

export const isPhone = () => window.matchMedia(PHONE_QUERY).matches

export function useIsPhone() {
  const [phone, setPhone] = useState(isPhone)
  useEffect(() => {
    const query = window.matchMedia(PHONE_QUERY)
    const onChange = () => setPhone(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return phone
}
