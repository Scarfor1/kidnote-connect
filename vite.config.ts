import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
// Set GITHUB_PAGES=true and REPO_NAME=your-repo-name when building for GitHub Pages
export default defineConfig(({ mode }) => ({
  // For GitHub Pages, set base to your repo name (e.g., '/my-notes-app/')
  // Leave empty for Lovable or custom domain deployment
  base: process.env.GITHUB_PAGES === "true" ? `/${process.env.REPO_NAME || "notes-app"}/` : "/",
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
