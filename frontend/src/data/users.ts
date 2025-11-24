import type { User } from 'firebase/auth'
import { updateProfile } from 'firebase/auth'
const API_URL = import.meta.env.VITE_API_URL;


export interface UserProfile {
  displayName?: string
  score?: number
}

export async function ensureUserDocument(user: User, displayNameOverride?: string) {
  if (!user?.uid) return

  const chosenName =
    displayNameOverride?.trim() ||
    user.displayName ||
    user.email ||
    'Anonymous Player'

  // Update Firebase auth profile locally for UI consistency
  if (user.displayName !== chosenName) {
    await updateProfile(user, { displayName: chosenName }).catch(() => undefined)
  }

  // Inform backend to ensure the user exists in SQL DB
  await fetch(`${API_URL}/api/users/ensure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: user.uid, displayName: chosenName }),
  }).catch(() => undefined)
}
