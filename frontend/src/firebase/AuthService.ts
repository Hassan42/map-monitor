import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth } from './BaseConfig';
import type { LoginFormValues, UserFormValues } from '../types/types';

setPersistence(auth,  browserLocalPersistence);

//Sign in functionality
export const firebaseSignIn = async ({ email, password }: LoginFormValues) => {
 const result = await signInWithEmailAndPassword(auth, email, password);
 return result;
};

//Sign up functionality
export const firebaseSignUp = async ({ email, password }: UserFormValues) => {
 const  result = await createUserWithEmailAndPassword(auth, email, password);
 return result;
};

//Sign out functionality
export const  firebaseSignOut  =  async () => {
 await  signOut(auth);
};