import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AppShell } from "@/components/layout/AppShell"
import {
  HomePage,
  ShiftsPage,
  ReconciliationPage,
  ProductsPage,
  MasterDataPage,
  ReportsPage,
} from "@/pages"

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shifts" element={<ShiftsPage />} />
        <Route path="/reconciliation" element={<ReconciliationPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/master" element={<MasterDataPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  </BrowserRouter>
)

export default App
