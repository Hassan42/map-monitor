import { useState } from 'react'
import type { FirebaseError } from 'firebase/app'
import { useAuth } from '../store/AuthContext'
import { formErrorClass, formSecondaryButtonClass } from '../styles/formStyles'
import googleIcon from '../assets/icons/google.svg'

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

// Google is the only way in: the same button signs up and signs in. A first sign in then asks for a
// username (AuthContext sends the user to /choose-username)
function GoogleSignInButton({ label = 'Continue with Google', showIcon = true }: { label?: string; showIcon?: boolean }) {
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
        <div className="flex flex-col items-center gap-2">
            {/* a neutral button, as Google's sign-in branding asks */}
            <button type="button" onClick={handleSignIn} disabled={loading} className={`${formSecondaryButtonClass} flex flex-none items-center justify-center gap-2 disabled:opacity-50`}>
                {showIcon && <img src={googleIcon} alt="" className="h-[18px] w-[18px]" />}
                {loading ? 'Signing in...' : label}
            </button>
            {error && <p className={formErrorClass}>{error}</p>}
        </div>
    )
}

export default GoogleSignInButton
