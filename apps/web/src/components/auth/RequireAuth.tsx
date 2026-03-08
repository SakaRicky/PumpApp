import { Navigate, Outlet } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/contexts/authContext"

export const RequireAuth = () => {
  const { t } = useTranslation()
  const { user, isLoaded } = useAuth()

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        {t("auth.loading")}
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
