import { useTranslation } from "react-i18next"
import { changeLanguage } from "@/i18n"
import { cn } from "@/lib/utils"

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation()

  return (
    <div
      className="px-1"
      role="group"
      aria-label={i18n.t("languageSwitcher.label")}
    >
      <div className="flex gap-1 rounded-lg bg-white/5 p-1">
        {(["en", "fr"] as const).map((lng) => (
          <button
            key={lng}
            type="button"
            onClick={() => changeLanguage(lng)}
            className={cn(
              "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
              i18n.language === lng
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/60 hover:text-white"
            )}
          >
            {i18n.t(`languageSwitcher.${lng}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
