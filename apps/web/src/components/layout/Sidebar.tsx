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
  Banknote,
  ClipboardList,
  Fuel,
  Users,
  LogOut,
} from "@/components/icons"
import { BrandLogo } from "@/components/BrandLogo"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { useAuth } from "@/contexts/authContext"

interface NavLinkConfig {
  to: string
  labelKey: string
  icon: ComponentType<{ className?: string }>
}

interface NavGroup {
  groupKey: string
  links: NavLinkConfig[]
}

const buildNavGroups = (isAdmin: boolean): NavGroup[] => [
  {
    groupKey: "operations",
    links: [
      { to: "/", labelKey: "dashboard", icon: LayoutDashboard },
      { to: "/shifts", labelKey: "shifts", icon: CalendarClock },
      { to: "/reconciliation", labelKey: "reconciliation", icon: Scale },
      {
        to: "/weekly-inventory",
        labelKey: "weeklyInventory",
        icon: ClipboardList,
      },
    ],
  },
  {
    groupKey: "masterData",
    links: [
      { to: "/products", labelKey: "products", icon: Package },
      // Categories and fuel setup are admin-only routes; hide the links too.
      ...(isAdmin
        ? [
            { to: "/categories", labelKey: "categories", icon: FolderOpen },
            { to: "/pumps", labelKey: "pumps", icon: Fuel },
          ]
        : []),
    ],
  },
  {
    groupKey: "reports",
    links: [{ to: "/reports", labelKey: "reports", icon: BarChart3 }],
  },
  ...(isAdmin
    ? [
        {
          groupKey: "admin",
          links: [
            { to: "/money", labelKey: "money", icon: Banknote },
            { to: "/users", labelKey: "users", icon: Users },
            { to: "/workers", labelKey: "workers", icon: Users },
          ],
        },
      ]
    : []),
]

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")

interface SidebarProps {
  onNavigate?: () => void
}

export const Sidebar = ({ onNavigate }: SidebarProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const navGroups = buildNavGroups(user?.role === "ADMIN")

  return (
    <aside
      className="flex h-full w-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:w-60"
      aria-label={t("nav.ariaLabel")}
    >
      <div className="flex h-16 items-center px-4">
        <NavLink to="/" className="transition-opacity hover:opacity-90">
          <BrandLogo withTagline />
        </NavLink>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-3 pt-2">
        {navGroups.map(({ groupKey, links }) => (
          <div key={groupKey} className="mb-5">
            <h2 className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/50">
              {t(`nav.groups.${groupKey}`)}
            </h2>
            <ul className="space-y-1">
              {links.map(({ to, labelKey, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={onNavigate}
                    className={({ isActive }: { isActive: boolean }) =>
                      cn(
                        "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                          : "text-sidebar-foreground/85 hover:bg-white/5 hover:text-white"
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

      <div className="border-t border-sidebar-border px-3 py-3">
        {user && (
          <div className="mb-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-white">
              {initials(user.name)}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span
                className="block truncate text-[13px] font-medium text-white"
                title={user.name}
              >
                {user.name}
              </span>
              <span className="block text-[11px] text-sidebar-foreground/60">
                {user.role === "ADMIN" ? "Manager" : t(`nav.links.users`)}
              </span>
            </span>
            <button
              type="button"
              className="rounded-md p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-white/5 hover:text-white"
              title={t("auth.logout")}
              onClick={() => {
                logout()
                onNavigate?.()
                navigate("/login", { replace: true })
              }}
            >
              <LogOut className="size-4" aria-hidden />
            </button>
          </div>
        )}
        <LanguageSwitcher />
        <p className="px-2 pt-2 text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
          PumpPro v1.0.0
        </p>
      </div>
    </aside>
  )
}
