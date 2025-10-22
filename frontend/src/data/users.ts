import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { updateProfile } from 'firebase/auth'
import { db } from '../firebase'

export interface UserProfile {
  displayName?: string
  score: number
  createdAt?: unknown
  updatedAt?: unknown
}

export async function ensureUserDocument(user: User, displayNameOverride?: string) {
  if (!user?.uid) {
    return
  }

  const userRef = doc(db, 'users', user.uid)

  const snapshot = await getDoc(userRef)
  const chosenName =
    displayNameOverride?.trim() ||
    user.displayName ||
    user.email ||
    'Anonymous Player'

  const baseProfile = {
    displayName: chosenName,
    updatedAt: serverTimestamp(),
  }

  if (snapshot.exists()) {
    await setDoc(userRef, baseProfile, { merge: true })
    if (user.displayName !== chosenName) {
      await updateProfile(user, { displayName: chosenName }).catch(() => undefined)
    }
    return
  }

  await setDoc(userRef, {
    ...baseProfile,
    score: 0,
    createdAt: serverTimestamp(),
  })

  if (user.displayName !== chosenName) {
    await updateProfile(user, { displayName: chosenName }).catch(() => undefined)
  }
}
