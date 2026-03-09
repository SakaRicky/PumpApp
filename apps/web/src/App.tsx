import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AppShell } from "@/components/layout/AppShell"
import { RequireAuth } from "@/components/auth/RequireAuth"
import { RequireAdmin } from "@/components/auth/RequireAdmin"
import {
  CategoriesPage,
  HomePage,
  LoginPage,
  MasterDataPage,
  ProductsPage,
  ReconciliationPage,
  ReportsPage,
  ShiftsPage,
  UsersPage,
  WorkersPage,
  PumpsPage,
} from "@/pages"
import { useAlert } from "@/contexts/AlertProvider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

const GlobalAlert = () => {
  const { alert, clearAlert } = useAlert()

  if (!alert) return null

  const variant = alert.variant === "error" ? "destructive" : "default"

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:px-8">
      <div className="pointer-events-auto w-full max-w-2xl">
        <Alert variant={variant}>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span className="font-medium">{alert.message}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearAlert}
            >
              ×
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}

const App = () => (
  <BrowserRouter>
    <GlobalAlert />
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/shifts" element={<ShiftsPage />} />
          <Route path="/reconciliation" element={<ReconciliationPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/master" element={<MasterDataPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/workers" element={<WorkersPage />} />
            <Route path="/pumps" element={<PumpsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
)

export default App
