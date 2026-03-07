import { useTranslation } from "react-i18next"
import { changeLanguage } from "@/i18n"
import { cn } from "@/lib/utils"

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation()

  return (
    <div
      className="border-t border-sidebar-border px-3 py-2"
      role="group"
      aria-label={i18n.t("languageSwitcher.label")}
    >
      <div className="flex gap-1 rounded-md p-1">
        {(["en", "fr"] as const).map((lng) => (
          <button
            key={lng}
            type="button"
            onClick={() => changeLanguage(lng)}
            className={cn(
              "flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors",
              i18n.language === lng
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            {i18n.t(`languageSwitcher.${lng}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
