import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { loadProjectEnv } from "./src/lib/config/env";
import { DEFAULT_CLIENT_PORT, resolveApiPort } from "./src/lib/config/ports";

loadProjectEnv(process.cwd());
const apiPort = resolveApiPort(process.env);

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    port: DEFAULT_CLIENT_PORT,
    proxy: {
      "/api": `http://127.0.0.1:${apiPort}`,
      "/generated-backgrounds": `http://127.0.0.1:${apiPort}`
    }
  }
});
