import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { useNavigate } from 'react-router'
import { auth } from '../firebase/BaseConfig'
import { firebaseSignOut, firebaseGoogleSignIn } from '../firebase/AuthService'
import type { IAuth } from '../types/types'
import { getMe, saveUsername } from '../api/user'
import type { FirebaseError } from 'firebase/app'

export const AuthContext = createContext<IAuth>({
  user: auth.currentUser,
  loading: false,
  username: '',
  chooseUsername: () => Promise.resolve(),
  signInWithGoogle: () => Promise.resolve(),
  signOut: () => { },
})

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true)
  const [username, setUsername] = useState<string | null>('')
  const navigate = useNavigate()

  const signInWithGoogle = async () => {
    setIsLoading(true)
    try {
      await firebaseGoogleSignIn() // onAuthStateChanged loads the user and username
    } catch (e) {
      if ((e as FirebaseError).code !== 'auth/popup-closed-by-user') throw e
    } finally {
      setIsLoading(false)
    }
  }

  // the one-time username pick after the first sign in; throws the server's error (400 format, 409 taken)
  const chooseUsername = async (name: string) => {
    const saved = await saveUsername(name)
    setUsername(saved.username)
    navigate('/', { replace: true })
  }

  const signOut = () => {
    setIsLoading(true);
    firebaseSignOut()
      .then(() => {
        setCurrentUser(null)
        setUsername('')
        navigate('/login', { replace: true })
      })
      .catch((error) => {
        console.error(error)
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    // listen for sign in / sign out; Firebase calls this once right away, then on every change
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsAuthLoading(true) // a new sign in: wait for its username before redirecting
      try {
        setCurrentUser(user)
        setUsername(user ? (await getMe()).username : null)
      } finally {
        setIsAuthLoading(false) // also when getMe fails, so the app never hangs
      }
    })
    return unsubscribe // stop listening when AuthProvider unmounts
  }, [])

  //redirect to /choose-username if the user is signed in but has no username, or to / if the user is signed in and has a username
  useEffect(() => {
    if (isAuthLoading || !currentUser) return
    if (username === null && location.pathname !== '/choose-username') navigate('/choose-username', { replace: true })
    else if (username && (location.pathname === '/login' || location.pathname === '/choose-username')) navigate('/', { replace: true })
  }, [isAuthLoading, currentUser, username, location.pathname])

  const authValues: IAuth = {
    user: currentUser,
    username,
    loading: isLoading,
    chooseUsername,
    signInWithGoogle,
    signOut,
  }

  if (isAuthLoading) return null

  return <AuthContext value={authValues}>{children}</AuthContext>
}

export const useAuth = () => useContext(AuthContext)

export default AuthProvider
