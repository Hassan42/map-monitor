import { Link } from 'react-router'
import AppLogo from './AppLogo'
import GoogleSignInButton from './GoogleSignInButton'
import topoIcon from '../assets/icons/topo.svg'
import relationsIcon from '../assets/icons/relations.svg'
import addLayerIcon from '../assets/icons/add-layer.svg'
import NavIcon from './NavIcon'

const DEMO_MAP_ID: string | undefined = import.meta.env.VITE_DEMO_MAP_ID || undefined
const DEMO_START = '1982-05-21' // the landings: where the story gets going

const FEATURES = [
  { icon: topoIcon, title: 'Territories that move', text: 'Drag the timeline and watch fronts advance, pockets form and ground change hands.' },
  { icon: relationsIcon, title: 'Events that connect', text: 'Link events by cause and retaliation, and follow how one led to the next.' },
  { icon: addLayerIcon, title: 'Layers you can share', text: 'Import layers from other public maps, with credit to the author built in.' },
]

// the public front door: what the app does, with a real map playing. Signed-in users go straight to their maps
function Landing() {
  // wide screens: everything fits one page, and the demo takes the height that's left. Very short screens still scroll
  return (
    <div className="flex min-h-dvh flex-col bg-neutral-950 text-gray-300 lg:h-dvh lg:min-h-[40rem]">
      <nav className="relative flex h-14 shrink-0 items-center justify-between gap-2 bg-neutral-900 px-3 md:h-16 md:justify-end md:px-5">
        <div className="md:absolute md:left-1/2 md:-translate-x-1/2"><AppLogo large /></div>
        <GoogleSignInButton label="Sign in" />
      </nav>

      <main className="flex min-h-0 flex-1 flex-col">
        <section className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 pb-4 pt-5 text-center md:pt-6">
          <h1 className="text-3xl font-semibold leading-tight text-white md:text-4xl">Map events and territories as they unfold</h1>
          <p className="max-w-xl text-gray-400 md:text-lg">
            A platform to diversify the sources behind world conflicts. See how events unfold on the map, build your own timeline, and share it publicly.
          </p>
          <div className="flex flex-wrap items-start justify-center gap-3">
            {DEMO_MAP_ID && (
              <Link to={`/maps/${DEMO_MAP_ID}`} className="bg-accent-400 px-4 py-1.5 font-medium text-neutral-900 transition-colors hover:bg-accent-300">
                Explore the demo
              </Link>
            )}
            <Link to="/explore" className="bg-neutral-800 px-4 py-1.5 text-gray-200 ring-1 ring-white/10 transition-colors hover:bg-neutral-700">
              Explore maps
            </Link>
            <GoogleSignInButton label="Create your map" showIcon={false} />
          </div>
        </section>

        <hr className="mb-4 shrink-0 border-neutral-800" />

        {/* the features beside the demo, so both show without scrolling. Phones: the demo first, then the features */}
        <section className={`grid min-h-0 flex-1 gap-x-4 gap-y-2 px-4 pb-4 ${DEMO_MAP_ID ? 'lg:grid-cols-[20rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)_auto]' : 'mx-auto max-w-3xl'}`}>
          <div className="flex min-h-0 flex-col gap-4 max-lg:order-last max-lg:mt-2">
            {FEATURES.map(({ icon, title, text }) => (
              <div key={title} className="flex flex-1 flex-col justify-center gap-1.5 bg-neutral-900 p-3 ring-1 ring-white/10">
                <h2 className="flex items-center gap-2 font-semibold text-white">
                  <span className="text-accent-300"><NavIcon src={icon} /></span>
                  {title}
                </h2>
                <p className="text-sm text-gray-400">{text}</p>
              </div>
            ))}
          </div>

          {DEMO_MAP_ID && (
            <>
              {/* the caption has its own row, so the cards line up with the map, top and bottom */}
              <div className="h-[50dvh] min-h-72 overflow-hidden bg-neutral-900 ring-1 ring-white/10 lg:h-auto lg:min-h-0">
                {/* the real map page in a frame, so the demo is exactly what the app looks like. It's a film, not
                    something to use: clicks and scrolling go to this page. The map code loads only with it */}
                <iframe
                  src={`/maps/${DEMO_MAP_ID}?demo&from=${DEMO_START}`}
                  title="Live demo of a map"
                  tabIndex={-1}
                  scrolling="no"
                  className="pointer-events-none h-full w-full border-0"
                />
              </div>
              <p className="text-center font-medium lg:col-start-2 text-gray-200">A live demo: <span className="font-semibold text-accent-300">the Falklands War, 1982</span>, event by event.</p>
            </>
          )}
        </section>

        {/* <section className="flex flex-col items-center gap-4 px-4 pb-16 text-center">
          <h2 className="text-2xl font-semibold text-white">Start your own map</h2>
          <GoogleSignInButton label="Create your map" showIcon={false} />
        </section> */}
      </main>

      {/* <footer className="border-t border-neutral-800 px-4 py-4 text-center text-xs text-gray-500">
        Map data © OpenStreetMap contributors, OpenFreeMap, OpenTopoMap (CC-BY-SA). Terrain: Mapterhorn. Coastlines in the demo: geoBoundaries (CC BY 4.0).
      </footer> */}
    </div>
  )
}

export default Landing
