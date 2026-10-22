import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../store/AuthContext'
import type { FirebaseError } from 'firebase/app'
import { formClass, formTitleClass, formFieldClass, formInputClass, formPrimaryButtonClass, formErrorClass } from '../styles/formStyles'

function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const { signIn, loading } = useAuth()
    const [error, setError] = useState('')

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        try {
            await signIn({ email, password });
        } catch (error) {
            //TODO: Custom error message
            setError((error as FirebaseError).message);
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-4 text-gray-300">
            <span className="font-mono text-sm font-bold uppercase tracking-widest text-accent-300">Map Monitor</span>
            <form onSubmit={handleSubmit} className={formClass}>
                <h1 className={formTitleClass}>Sign in</h1>
                <div className={formFieldClass}>
                    <label htmlFor="email">Email</label>
                    <input type="email" id="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className={formInputClass} />
                </div>
                <div className={formFieldClass}>
                    <label htmlFor="password">Password</label>
                    <input type="password" id="password" name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className={formInputClass} />
                </div>
                {error && <p className={formErrorClass}>{error}</p>}
                <button type="submit" disabled={loading} className={formPrimaryButtonClass}>
                    {loading ? 'Signing in...' : 'Sign in'}
                </button>
                <p className="text-center text-sm text-gray-400">
                    No account?{' '}
                    <Link to="/register" className="text-accent-300 hover:underline">Register</Link>
                </p>
            </form>
        </div>
    )
}


export default Login
