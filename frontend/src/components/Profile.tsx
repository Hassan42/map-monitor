import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { changeDescription, getProfile } from '../api/user'
import { useAuth } from '../store/AuthContext'
import { formErrorClass, formInputClass, formPrimaryButtonClass, formSecondaryButtonClass } from '../styles/formStyles'
import { navButtonClass } from '../styles/navStyles'
import type { Profile as ProfileData } from '../types/types'
import AppLogo from './AppLogo'
import GoogleSignInButton from './GoogleSignInButton'
import PublicMapCard from './PublicMapCard'

const MAX_DESCRIPTION = 300

// someone's public page: picture (a placeholder for now), description and public maps. Open to visitors;
// the owner can edit the description
function Profile() {
    const { username = '' } = useParams()
    const { user } = useAuth()

    // the answer remembers which request it's for: until it matches, that request is still loading.
    // The signed-in user is part of it, since signing in here can turn this into your own profile
    const key = `${username}|${user?.uid ?? ''}`
    const [result, setResult] = useState<{ key: string; profile: ProfileData | null; error: string } | null>(null)
    const loading = result?.key !== key
    const profile = loading ? null : result.profile
    const error = loading ? '' : result.error

    useEffect(() => {
        let stale = false // a newer request started: this answer no longer counts
        getProfile(username)
            .then((found) => {
                if (!stale) setResult({ key, profile: found, error: '' })
            })
            .catch((e: Error) => {
                if (!stale) setResult({ key, profile: null, error: e.message.includes('404') ? 'User not found' : 'Could not load profile' })
            })
        return () => {
            stale = true
        }
    }, [key, username])

    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState('')
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')

    const startEditing = () => {
        setDraft(profile?.description ?? '')
        setSaveError('')
        setEditing(true)
    }

    const handleSave = async () => {
        if (!profile) return
        setSaving(true)
        setSaveError('')
        try {
            const { description } = await changeDescription(draft)
            setResult({ key, profile: { ...profile, description }, error: '' })
            setEditing(false)
        } catch {
            setSaveError('Could not save description') // the text stays, so it can be tried again
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-gray-300">
            <nav className="sticky top-0 z-50 flex h-14 items-center justify-between gap-2 bg-neutral-900 px-3 select-none">
                <span className="px-2"><AppLogo /></span>
                {user ? <Link to="/maps" className={navButtonClass}>Your Maps</Link> : <GoogleSignInButton label="Sign in" />}
            </nav>

            <main className="mx-auto max-w-6xl p-6">
                {loading && <p className="text-gray-500">Loading profile...</p>}
                {error && <p className="text-red-400">{error}</p>}

                {profile && (
                    <>
                        <header className="mb-8 flex gap-4 border-b border-neutral-800 pb-6">
                            {/* the picture's place: a placeholder until pictures exist */}
                            <div aria-hidden="true" className="flex h-20 w-20 shrink-0 items-center justify-center bg-neutral-800 font-mono text-3xl font-bold uppercase text-accent-300 ring-1 ring-white/10">
                                {profile.username.charAt(0)}
                            </div>

                            <div className="flex min-w-0 max-w-2xl flex-1 flex-col gap-2">
                                <h1 className="truncate text-xl font-semibold text-white">{profile.username}</h1>

                                {editing && profile.owned ? (
                                    <div className="flex flex-col gap-2">
                                        <textarea
                                            aria-label="Description"
                                            autoFocus
                                            rows={4}
                                            maxLength={MAX_DESCRIPTION}
                                            value={draft}
                                            onChange={(e) => setDraft(e.target.value)}
                                            className={`${formInputClass} w-full resize-y`}
                                        />
                                        <div className="flex items-center gap-2">
                                            <button type="button" disabled={saving} onClick={handleSave} className={formPrimaryButtonClass}>
                                                {saving ? 'Saving...' : 'Save'}
                                            </button>
                                            <button type="button" disabled={saving} onClick={() => setEditing(false)} className={formSecondaryButtonClass}>
                                                Cancel
                                            </button>
                                            <span className="ml-auto text-xs text-gray-500">{draft.length}/{MAX_DESCRIPTION}</span>
                                        </div>
                                        {saveError && <p className={formErrorClass}>{saveError}</p>}
                                    </div>
                                ) : (
                                    <>
                                        {profile.description && <p className="whitespace-pre-line break-words text-sm text-gray-400">{profile.description}</p>}
                                        {profile.owned && (
                                            <button type="button" onClick={startEditing} className="self-start text-sm text-accent-300 hover:underline">
                                                {profile.description ? 'Edit' : 'Add a description'}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </header>

                        {profile.maps.length === 0 ? (
                            <p className="border border-dashed border-neutral-700 py-16 text-center text-gray-400">No public maps yet.</p>
                        ) : (
                            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {profile.maps.map((map) => <PublicMapCard key={map.id} map={map} />)}
                            </ul>
                        )}
                    </>
                )}
            </main>
        </div>
    )
}

export default Profile
