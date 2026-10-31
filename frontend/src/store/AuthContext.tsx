import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { useNavigate } from 'react-router'
import { auth } from '../firebase/BaseConfig'
import { firebaseSignIn, firebaseSignUp, firebaseSignOut } from '../firebase/AuthService'
import type { IAuth, LoginFormValues, UserFormValues } from '../types/types'
import { createUserProfile, getMe } from '../api/user'

export const AuthContext = createContext<IAuth>({
  user: auth.currentUser,
  loading: false,
  username: '',
  signIn: () => Promise.resolve(),
  signUp: () => Promise.resolve(),
  signOut: () => {},
})

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true)
  const [username, setUsername] = useState<string | null>('')
  const navigate = useNavigate()

  const signIn = async (creds: LoginFormValues) => {
    setIsLoading(true);
    return firebaseSignIn(creds)
      .then((result) => {
        setCurrentUser(result.user)
        navigate('/', { replace: true })
      })
      .finally(() => setIsLoading(false));
  }

  const signUp = async (creds: UserFormValues) => {
    setIsLoading(true);
    return firebaseSignUp(creds)
      .then(async (result) => {
        setCurrentUser(result.user)
        await createUserProfile(creds.username)
        setUsername(creds.username)
        navigate('/', { replace: true })
      })
      .finally(() => setIsLoading(false));
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setUsername(user ? (await getMe()).username : null)
      setIsAuthLoading(false);
    })
    return unsubscribe;
  }, [])

  const authValues: IAuth = {
    user: currentUser,
    username,
    loading: isLoading,
    signIn,
    signUp,
    signOut,
  }

  if (isAuthLoading) return null

  return <AuthContext value={authValues}>{children}</AuthContext>
}

export const useAuth = () => useContext(AuthContext)

export default AuthProvider
