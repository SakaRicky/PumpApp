import { useState } from "react"
import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Menu, X } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const AppShell = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/45 transition-opacity lg:hidden",
          sidebarOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
        aria-hidden
        onClick={() => setSidebarOpen(false)}
      />

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[86vw] transform transition-transform duration-200 ease-out lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? (
              <X className="size-5" aria-hidden />
            ) : (
              <Menu className="size-5" aria-hidden />
            )}
          </Button>
          <span className="text-sm font-semibold tracking-tight">PumpPro</span>
          <span className="size-9" aria-hidden />
        </div>
        <Outlet />
      </main>
    </div>
  )
}
