import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Fail loudly instead of silently picking another port, so the dev URL is predictable.
    strictPort: true,
    host: true,
  },
});
