import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { useAuth } from '../store/AuthContext'
import { formClass, formTitleClass, formFieldClass, formInputClass, formPrimaryButtonClass, formErrorClass } from '../styles/formStyles'

// the backend's rule (UserService): 3-30 letters, digits, _ or -
const USERNAME = /^[A-Za-z0-9_-]{3,30}$/

// after the first Google sign in: pick the username, once. AuthContext keeps the user here until they have one
function ChooseUsername() {
    const { chooseUsername, signOut, user } = useAuth()
    const [name, setName] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const trimmed = name.trim()
    // shown as you type, once there's something typed
    const formatError = trimmed !== '' && !USERNAME.test(trimmed) ? 'Use 3-30 letters, digits, _ or -' : ''

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault()
        if (!USERNAME.test(trimmed)) return setError('Use 3-30 letters, digits, _ or -')
        setError('')
        setSaving(true)
        try {
            await chooseUsername(trimmed)
        } catch (error) {
            setError(usernameErrorMessage(error as Error))
            setSaving(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-4 text-gray-300">
            <span className="font-mono text-sm font-bold uppercase tracking-widest text-accent-300">Map Monitor</span>
            <form onSubmit={handleSubmit} className={formClass}>
                <h1 className={formTitleClass}>Choose a username</h1>
                <p className="text-sm text-gray-400">It's shown on the layers you share. You can't change it later.</p>
                <div className={formFieldClass}>
                    <label htmlFor="username">Username</label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        autoComplete="username"
                        autoFocus
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value)
                            setError('')
                        }}
                        className={formInputClass}
                    />
                    <span className="text-xs text-gray-500">3-30 letters, digits, _ or -</span>
                </div>
                {(error || formatError) && <p className={formErrorClass}>{error || formatError}</p>}
                <button type="submit" disabled={saving || !USERNAME.test(trimmed)} className={formPrimaryButtonClass}>
                    {saving ? 'Saving...' : 'Continue'}
                </button>
                {/* signed in with the wrong Google account: switch */}
                <p className="text-center text-sm text-gray-400">
                    {user?.email && <>Signed in as {user.email}. </>}
                    <button type="button" onClick={signOut} className="text-accent-300 hover:underline">Sign out</button>
                </p>
            </form>
        </div>
    )
}

// apiFetch throws "API error: <status>": 409 = someone has that name, 400 = the server refused the format
function usernameErrorMessage(error: Error): string {
    if (error.message.includes('409')) return 'That username is taken. Try another.'
    if (error.message.includes('400')) return 'Use 3-30 letters, digits, _ or -'
    return "Couldn't save your username. Try again."
}

export default ChooseUsername
