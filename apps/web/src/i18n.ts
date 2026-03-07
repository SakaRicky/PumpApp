import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import en from "./locales/en.json"
import fr from "./locales/fr.json"

const STORAGE_KEY = "pumppro-locale"

const getStoredLanguage = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null

const getInitialLanguage = (): string => {
  const stored = getStoredLanguage()
  if (stored === "en" || stored === "fr") return stored
  const browser = navigator.language.toLowerCase()
  if (browser.startsWith("fr")) return "fr"
  return "en"
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
})

i18n.on("languageChanged", (lng) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng
  }
})

document.documentElement.lang = i18n.language

export const changeLanguage = (lng: "en" | "fr") => {
  i18n.changeLanguage(lng)
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, lng)
  }
}

export default i18n
