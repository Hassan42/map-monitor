import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { useAuth } from '../store/AuthContext'
import type { FirebaseError } from 'firebase/app'

function Register() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const { signUp, loading } = useAuth()
    const [error, setError] = useState('')

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault()
        try {
            await signUp({ email, password })
        } catch (error) {
            //TODO: Custom error message
            setError((error as FirebaseError).message);
        }
    }

    return (
        <div className="flex items-center justify-center h-screen">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-80">
                <div className="flex flex-col gap-1">
                    <label htmlFor="email">Email:</label>
                    <input type="email" id="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} className="border border-gray-300 px-2 py-1 text-black" />
                </div>
                <div className="flex flex-col gap-1">
                    <label htmlFor="password">Password:</label>
                    <input type="password" id="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} className="border border-gray-300 px-2 py-1 text-black" />
                </div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <button type="submit" disabled={loading} className="bg-blue-600 text-white px-2 py-1">
                    {loading ? 'Registering...' : 'Register'}
                </button>
            </form>
        </div>
    )
}


export default Register
