import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

// `pnpm dev:lan` serves HTTPS so a phone on the LAN may use its camera.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), mode === "lan" && basicSsl()],
  build: { chunkSizeWarningLimit: 900 },
}));
