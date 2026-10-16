"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { UserProfile } from "@/types";

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, displayName: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, displayName: string) => Promise<void>;
  signInAsGuest: (cohortTag?: string) => Promise<void>;
  signInAnonymouslyWithCohort: (cohortTag?: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  registerWithEmail: async () => {},
  signInAsGuest: async () => {},
  signInAnonymouslyWithCohort: async () => {},
  logOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            setUserProfile(snap.data() as UserProfile);
          } else {
            const initialProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || (currentUser.isAnonymous ? "Sinh viên ẩn danh" : "Sinh viên"),
              photoURL: currentUser.photoURL,
              isAnonymous: currentUser.isAnonymous,
              role: "student",
            };
            await setDoc(userDocRef, initialProfile);
            setUserProfile(initialProfile);
          }
        } catch (err) {
          console.warn("Could not fetch user profile from Firestore:", err);
          setUserProfile({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName || (currentUser.isAnonymous ? "Sinh viên ẩn danh" : "Sinh viên"),
            photoURL: currentUser.photoURL,
            isAnonymous: currentUser.isAnonymous,
            role: "student"
          });
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUpWithEmail = async (email: string, pass: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName });
    const profile: UserProfile = {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName,
      photoURL: null,
      isAnonymous: false,
      role: "student"
    };
    try {
      await setDoc(doc(db, "users", cred.user.uid), profile);
    } catch (e) {
      console.warn("Failed to set user doc:", e);
    }
  };

  const signInAsGuest = async (cohortTag?: string) => {
    const cred = await signInAnonymously(auth);
    const guestName = cohortTag ? `Sinh viên (${cohortTag})` : "Sinh viên ẩn danh";
    await updateProfile(cred.user, { displayName: guestName });
    const profile: UserProfile = {
      uid: cred.user.uid,
      email: null,
      displayName: guestName,
      photoURL: null,
      isAnonymous: true,
      role: "student",
      cohort: cohortTag
    };
    try {
      await setDoc(doc(db, "users", cred.user.uid), profile);
    } catch (e) {
      console.warn("Failed to set user doc:", e);
    }
  };

  const logOut = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        registerWithEmail: signUpWithEmail,
        signInAsGuest,
        signInAnonymouslyWithCohort: signInAsGuest,
        logOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
