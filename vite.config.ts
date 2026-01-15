import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
// GitHub Pages base path notes:
// - Project pages: https://owner.github.io/repo/  -> base should be "/repo/"
// - User/Org pages: https://owner.github.io/       -> base should be "/"
export default defineConfig(({ mode }) => ({
  // Prefer explicit BASE_PATH from CI; otherwise fall back to repo-name base for project pages.
  base:
    process.env.GITHUB_PAGES === "true"
      ? (process.env.BASE_PATH || `/${process.env.REPO_NAME || "notes-app"}/`)
      : "/",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
