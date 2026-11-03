import { GoogleAuthProvider, signInWithPopup, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { auth } from './BaseConfig'

setPersistence(auth, browserLocalPersistence)

// Google is the only sign-in: the same popup signs up and signs in
const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' }) // always let them pick the account

export const firebaseGoogleSignIn = () => signInWithPopup(auth, googleProvider)

export const firebaseSignOut = async () => {
  await signOut(auth)
}
