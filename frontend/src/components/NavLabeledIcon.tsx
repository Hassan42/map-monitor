import NavIcon from './NavIcon'

// a nav button's icon with a short word under it, from xl up (smaller screens: the icon alone, the
// tooltip says what it is)
function NavLabeledIcon({ src, label, className = '' }: { src: string; label: string; className?: string }) {
  return (
    <span className="flex flex-col items-center gap-1">
      <NavIcon src={src} className={className} />
      <span className="hidden text-[11px] font-medium leading-none xl:block">{label}</span>
    </span>
  )
}

export default NavLabeledIcon
