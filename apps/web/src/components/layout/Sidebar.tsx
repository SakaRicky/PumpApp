import type { ComponentType } from "react"
import { NavLink } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  CalendarClock,
  Scale,
  Package,
  FolderOpen,
  BarChart3,
} from "@/components/icons"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

interface NavLinkConfig {
  to: string
  labelKey: string
  icon: ComponentType<{ className?: string }>
}

interface NavGroup {
  groupKey: string
  links: NavLinkConfig[]
}

const navGroups: NavGroup[] = [
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

export const Sidebar = () => {
  const { t } = useTranslation()

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
      <LanguageSwitcher />
    </aside>
  )
}
