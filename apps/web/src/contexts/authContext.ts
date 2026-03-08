import { createContext, useContext } from "react"
import type { AuthUser } from "./authTypes"

const TOKEN_KEY = "pumpapp_token"
const USER_KEY = "pumpapp_user"

export interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isLoaded: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export const readStored = (): { token: string | null; user: AuthUser | null } => {
  if (typeof window === "undefined") return { token: null, user: null }
  const token = localStorage.getItem(TOKEN_KEY)
  const userRaw = localStorage.getItem(USER_KEY)
  let user: AuthUser | null = null
  if (userRaw) {
    try {
      user = JSON.parse(userRaw) as AuthUser
    } catch {
      // ignore
    }
  }
  return { token, user }
}

export const getInitialState = (): {
  token: string | null
  user: AuthUser | null
  isLoaded: boolean
} => {
  const { token, user } = readStored()
  return { token, user, isLoaded: true }
}

export const getStorageKeys = () => ({ TOKEN_KEY, USER_KEY })

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
