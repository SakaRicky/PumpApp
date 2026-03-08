import { Navigate, Outlet } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/contexts/authContext"

export const RequireAdmin = () => {
  const { t } = useTranslation()
  const { user, isLoaded } = useAuth()

  if (!isLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
        {t("auth.loading")}
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8">
        <p className="text-lg font-medium">{t("auth.forbidden")}</p>
        <p className="text-sm text-muted-foreground">
          {t("auth.forbiddenHint")}
        </p>
      </div>
    )
  }

  return <Outlet />
}
