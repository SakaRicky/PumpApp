import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/authContext"
import { Button } from "@/components/ui/button"

export const LoginPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, isLoaded, login } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  useEffect(() => {
    if (isLoaded && user) navigate("/", { replace: true })
  }, [isLoaded, user, navigate])

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (isLoaded && user) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await api.login(username, password)
      login(data.token, data.user)
      navigate("/", { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.error"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold">{t("login.title")}</h1>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="space-y-2">
          <label htmlFor="username" className="block text-sm font-medium">
            {t("login.username")}
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium">
            {t("login.password")}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("login.submitting") : t("login.submit")}
        </Button>
      </form>
    </div>
  )
}
