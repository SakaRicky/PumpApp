import type { ComponentType } from "react"
import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  CalendarClock,
  Scale,
  Package,
  FolderOpen,
  BarChart3,
} from "@/components/icons"

interface NavGroup {
  label: string
  links: {
    to: string
    label: string
    icon: ComponentType<{ className?: string }>
  }[]
}

const navGroups: NavGroup[] = [
  {
    label: "Operations",
    links: [
      { to: "/shifts", label: "Shifts", icon: CalendarClock },
      { to: "/reconciliation", label: "Reconciliation", icon: Scale },
    ],
  },
  {
    label: "Master data",
    links: [
      { to: "/products", label: "Products", icon: Package },
      { to: "/master", label: "Categories & more", icon: FolderOpen },
    ],
  },
  {
    label: "Reports",
    links: [{ to: "/reports", label: "Reports", icon: BarChart3 }],
  },
]

export const Sidebar = () => (
  <aside
    className="flex h-full w-56 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
    aria-label="Main navigation"
  >
    <div className="flex h-14 items-center border-b border-sidebar-border px-4">
      <NavLink
        to="/"
        className="flex items-center gap-2 font-semibold text-sidebar-primary hover:text-sidebar-primary/90"
      >
        <LayoutDashboard className="size-5 shrink-0" aria-hidden />
        PumpPro
      </NavLink>
    </div>
    <nav className="flex-1 overflow-y-auto p-3">
      {navGroups.map((group) => (
        <div key={group.label} className="mb-4">
          <h2 className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {group.label}
          </h2>
          <ul className="space-y-0.5">
            {group.links.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }: { isActive: boolean }) =>
                    cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )
                  }
                  end={to === "/"}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  </aside>
)
