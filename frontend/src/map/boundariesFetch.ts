import {pointInRing} from './geometry';


interface Piece {
    id: string;
    name: string;
    ring: number[][];
}

export type FillLevel = 'country' | 'state';

let countries: Piece[] | null = null;
const statesByCountry = new Map<string, Piece[]>();


async function loadPieces(url: string): Promise<Piece[]> {
    try {
        const res = await fetch(url);
        return res.ok ? await res.json() : [];
    } catch {
        return []; // missing file (dev serves HTML) or a network error
    }
}


export async function findBoundaryAt(lng: number, lat: number, level: FillLevel): Promise<number[][][] | null> {

    const point = [lng, lat];

    countries ??= await loadPieces('/boundaries/countries.json');

    const country = countries.find((p) => pointInRing(point, p.ring))

    if (!country) return null;
    
    if (level === 'state') {

    let states = statesByCountry.get(country.id);
    if (!states) {
        states = await loadPieces(`/boundaries/states/${country.id}.json`);
        statesByCountry.set(country.id, states);
    }

    const state = states.find((p) => pointInRing(point, p.ring));
    
    if (state) return [state.ring]

    }

    return [country.ring]; // country level, or a country without states

    
}

