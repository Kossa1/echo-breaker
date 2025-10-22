import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCx6k1gi6wM2ozvX7XlC0irksVXUyauYVI",
  authDomain: "echo-breaker.firebaseapp.com",
  projectId: "echo-breaker",
  storageBucket: "echo-breaker.firebasestorage.app",
  messagingSenderId: "965193107953",
  appId: "1:965193107953:web:9d864999ece619f4069c50",
  measurementId: "G-L6NJ0EK43C",
}

export const firebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)

// Initialize Analytics lazily and ignore blockers/errors in dev
export const analyticsReady = (async () => {
  try {
    const mod = await import('firebase/analytics')
    const ok = await mod.isSupported()
    return ok ? mod.getAnalytics(firebaseApp) : null
  } catch {
    return null
  }
})()

export default firebaseApp
