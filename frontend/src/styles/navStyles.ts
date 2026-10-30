// shared look for every nav bar button; accent comes from the theme (index.css). Labels stay on one line
// and buttons never squeeze (nowrap, shrink-0); on narrower screens they're a bit tighter (px-3)
export const navButtonClass =
    'shrink-0 whitespace-nowrap px-2 md:px-3 xl:px-4 py-2 transition-[color,background-color,box-shadow,transform] hover:bg-accent-400/15 hover:text-accent-300'

// added to a nav button while it's toggled on: pressed in, like a physical switch - an inner shadow at
// the top, a thin accent edge, and one pixel lower
export const navButtonActiveClass =
    'bg-accent-400/15 text-accent-300 translate-y-px shadow-[inset_0_2px_5px_rgba(0,0,0,0.6)] ring-1 ring-inset ring-accent-400/40'
