import path from "node:path"
import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"

const rootDir = path.resolve(__dirname, "../..")

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env from monorepo root so VITE_* (e.g. VITE_CURRENCY_LABEL) are available
  const env = loadEnv(mode, rootDir, "")
  const currencyLabel = env.VITE_CURRENCY_LABEL?.trim() ?? ""

  return {
    plugins: [react()],
    envDir: rootDir,
    define: {
      "import.meta.env.VITE_CURRENCY_LABEL": JSON.stringify(currencyLabel),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
    },
  }
})
