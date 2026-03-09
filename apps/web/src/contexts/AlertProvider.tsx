import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"

type AlertVariant = "success" | "error" | "info"

interface AlertState {
  message: string
  variant: AlertVariant
}

interface AlertContextValue {
  alert: AlertState | null
  showAlert: (message: string, variant?: AlertVariant) => void
  clearAlert: () => void
}

const AlertContext = createContext<AlertContextValue | undefined>(undefined)

interface AlertProviderProps {
  children: ReactNode
}

export const AlertProvider = ({ children }: AlertProviderProps): JSX.Element => {
  const [alert, setAlert] = useState<AlertState | null>(null)

  const showAlert = useCallback((message: string, variant: AlertVariant = "info") => {
    setAlert({ message, variant })
  }, [])

  const clearAlert = useCallback(() => {
    setAlert(null)
  }, [])

  return (
    <AlertContext.Provider value={{ alert, showAlert, clearAlert }}>
      {children}
    </AlertContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAlert = (): AlertContextValue => {
  const ctx = useContext(AlertContext)
  if (!ctx) {
    throw new Error("useAlert must be used within an AlertProvider")
  }
  return ctx
}

export default AlertProvider

