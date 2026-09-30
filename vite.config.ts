import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import { libreofficeLocalPlugin } from "./src/server/libreofficeVitePlugin.ts"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), libreofficeLocalPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
})
