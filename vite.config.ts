import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
  define: {
    // Fallback: ensure Supabase env vars are always available
    ...((!process.env.VITE_SUPABASE_URL) && {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify("https://tglgxdfqfwspykzxwxgy.supabase.co"),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbGd4ZGZxZndzcHlrenh3eGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTI1MzIsImV4cCI6MjA4MjU2ODUzMn0.3y5ylCEWPp688cxe2Tfo4tDvV0t2T6S20fkn8cNN_RY"),
    }),
  },
}));
