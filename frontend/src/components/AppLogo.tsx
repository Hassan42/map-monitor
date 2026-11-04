// the app's name with its icon (the same file as the browser tab's icon), for the top of the main pages.
// large: the landing page's, bigger from tablet width up (a phone has no room beside its Sign in button)
function AppLogo({ large = false }: { large?: boolean }) {
    return (
        <span className={`flex items-center font-mono font-bold uppercase tracking-widest text-accent-300 ${large ? 'gap-2 text-sm md:gap-3 md:text-3xl' : 'gap-2 text-sm'}`}>
            <img src="/favicon.svg" alt="" className={large ? 'h-7 w-7 md:h-11 md:w-11' : 'h-7 w-7'} />
            Map Monitor
        </span>
    )
}

export default AppLogo
