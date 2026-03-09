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

const App = () => (
  <BrowserRouter>
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
