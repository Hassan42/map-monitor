import { useState } from 'react'
import { useAuth } from '../store/AuthContext'
import type { FirebaseError } from 'firebase/app'
import { formClass, formTitleClass, formSecondaryButtonClass, formErrorClass } from '../styles/formStyles'
import googleIcon from '../assets/icons/google.svg'

// Google is the only way in: the same button signs up and signs in. A first sign in then asks for a
// username (AuthContext sends the user to /choose-username)
function Login() {
    const { signInWithGoogle, loading } = useAuth()
    const [error, setError] = useState('')

    const handleSignIn = async () => {
        setError('')
        try {
            await signInWithGoogle()
        } catch (error) {
            setError(signInErrorMessage(error as FirebaseError))
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-4 text-gray-300">
            <span className="font-mono text-sm font-bold uppercase tracking-widest text-accent-300">Map Monitor</span>
            <div className={formClass}>
                <h1 className={formTitleClass}>Sign in</h1>
                <p className="text-sm text-gray-400">New here? Signing in with Google creates your account.</p>
                {error && <p className={formErrorClass}>{error}</p>}
                <button type="button" onClick={handleSignIn} disabled={loading} className={`${formSecondaryButtonClass} flex items-center justify-center gap-2 disabled:opacity-50`}>
                    {/* a neutral button, as Google's sign-in branding asks: the logo's yellow would vanish on the accent one */}
                    <img src={googleIcon} alt="" className="h-[18px] w-[18px]" />
                    {loading ? 'Signing in...' : 'Continue with Google'}
                </button>
            </div>
        </div>
    )
}

// Firebase's own messages ("Firebase: Error (auth/...)") aren't meant for users
function signInErrorMessage(error: FirebaseError): string {
    switch (error.code) {
        case 'auth/popup-blocked':
            return 'The browser blocked the sign-in window. Allow pop-ups for this site and try again.'
        case 'auth/network-request-failed':
            return "Couldn't reach Google. Check your connection and try again."
        case 'auth/unauthorized-domain':
            return "Sign-in isn't set up for this address yet."
        default:
            return "Couldn't sign in. Try again."
    }
}

export default Login
