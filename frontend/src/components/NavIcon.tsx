// a nav bar icon from an SVG file (src/assets/icons), drawn in the button's text color: the SVG is used
// as a mask over currentColor, so it turns accent on hover / when active like the button's text
function NavIcon({ src, className = '' }: { src: string; className?: string }) {
  const mask = `url("${src}") center / contain no-repeat`
  return <span aria-hidden="true" className={`inline-block h-5 w-5 shrink-0 bg-current ${className}`} style={{ mask, WebkitMask: mask }} />
}

export default NavIcon
