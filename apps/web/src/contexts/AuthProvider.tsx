import { useCallback, useState, type ReactNode } from "react"
import {
  AuthContext,
  getInitialState,
  getStorageKeys,
} from "./authContext"

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState(getInitialState)
  const { TOKEN_KEY, USER_KEY } = getStorageKeys()

  const login = useCallback(
    (token: string, user: { id: number; name: string; role: string }) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(TOKEN_KEY, token)
        localStorage.setItem(USER_KEY, JSON.stringify(user))
      }
      setState({ token, user, isLoaded: true })
    },
    [TOKEN_KEY, USER_KEY]
  )

  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    }
    setState({ token: null, user: null, isLoaded: true })
  }, [TOKEN_KEY, USER_KEY])

  const value = {
    ...state,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
