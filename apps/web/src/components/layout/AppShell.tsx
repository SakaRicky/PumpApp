import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"

export const AppShell = () => (
  <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
    <Sidebar />
    <main className="flex flex-1 flex-col overflow-hidden">
      <Outlet />
    </main>
  </div>
)
