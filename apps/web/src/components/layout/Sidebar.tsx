import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"

interface NavGroup {
  label: string
  links: { to: string; label: string }[]
}

const navGroups: NavGroup[] = [
  {
    label: "Operations",
    links: [
      { to: "/shifts", label: "Shifts" },
      { to: "/reconciliation", label: "Reconciliation" },
    ],
  },
  {
    label: "Master data",
    links: [
      { to: "/products", label: "Products" },
      { to: "/master", label: "Categories & more" },
    ],
  },
  {
    label: "Reports",
    links: [{ to: "/reports", label: "Reports" }],
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
        className="font-semibold text-sidebar-primary hover:text-sidebar-primary/90"
      >
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
            {group.links.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }: { isActive: boolean }) =>
                    cn(
                      "block rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )
                  }
                  end={to === "/"}
                >
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
