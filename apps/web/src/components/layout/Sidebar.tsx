import type { ComponentType } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  CalendarClock,
  Scale,
  Package,
  FolderOpen,
  BarChart3,
  Users,
  LogOut,
} from "@/components/icons"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { useAuth } from "@/contexts/authContext"
import { Button } from "@/components/ui/button"

interface NavLinkConfig {
  to: string
  labelKey: string
  icon: ComponentType<{ className?: string }>
}

interface NavGroup {
  groupKey: string
  links: NavLinkConfig[]
}

const baseNavGroups: NavGroup[] = [
  {
    groupKey: "operations",
    links: [
      { to: "/shifts", labelKey: "shifts", icon: CalendarClock },
      { to: "/reconciliation", labelKey: "reconciliation", icon: Scale },
    ],
  },
  {
    groupKey: "masterData",
    links: [
      { to: "/products", labelKey: "products", icon: Package },
      { to: "/master", labelKey: "categoriesAndMore", icon: FolderOpen },
    ],
  },
  {
    groupKey: "reports",
    links: [{ to: "/reports", labelKey: "reports", icon: BarChart3 }],
  },
]

const adminNavGroup: NavGroup = {
  groupKey: "admin",
  links: [
    { to: "/users", labelKey: "users", icon: Users },
    { to: "/workers", labelKey: "workers", icon: Users },
  ],
}

export const Sidebar = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const navGroups =
    user?.role === "ADMIN" ? [...baseNavGroups, adminNavGroup] : baseNavGroups

  return (
    <aside
      className="flex h-full w-56 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
      aria-label={t("nav.ariaLabel")}
    >
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <NavLink
          to="/"
          className="flex items-center gap-2 font-semibold text-sidebar-primary hover:text-sidebar-primary/90"
        >
          <LayoutDashboard className="size-5 shrink-0" aria-hidden />
          {t("app.name")}
        </NavLink>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        {navGroups.map(({ groupKey, links }) => (
          <div key={groupKey} className="mb-4">
            <h2 className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t(`nav.groups.${groupKey}`)}
            </h2>
            <ul className="space-y-0.5">
              {links.map(({ to, labelKey, icon: Icon }) => (
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
                    {t(`nav.links.${labelKey}`)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {user && (
          <p className="px-3 py-1 text-xs text-muted-foreground truncate" title={user.name}>
            {user.name}
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => {
            logout()
            navigate("/login", { replace: true })
          }}
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          {t("auth.logout")}
        </Button>
      </div>
      <LanguageSwitcher />
    </aside>
  )
}
