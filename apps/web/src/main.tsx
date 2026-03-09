import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { AuthProvider } from "@/contexts/AuthProvider"
import { AlertProvider } from "@/contexts/AlertProvider"
import "./i18n"
import "./index.css"
import App from "./App.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <AlertProvider>
        <App />
      </AlertProvider>
    </AuthProvider>
  </StrictMode>
)
