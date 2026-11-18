import { network, isValidPort, proxyHost } from "./shared/runtime.mjs";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const clientPort = Number(env.CLIENT_PORT || network.clientPort);
  if (!isValidPort(clientPort))
    throw new Error("CLIENT_PORT는 1~65535 사이의 정수여야 합니다.");
  return {
    base: env.VITE_BASE_PATH || "/",
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            editor: [
              "@uiw/react-codemirror",
              "@codemirror/lang-sql",
              "@codemirror/theme-one-dark",
            ],
            vendor: ["react", "react-dom"],
          },
        },
      },
    },
    server: {
      host: network.host,
      port: clientPort,
      strictPort: true,
      proxy: {
        [network.apiPrefix]: `http://${proxyHost(env.HOST)}:${env.PORT || network.apiPort}`,
      },
      // Temporary browser profiles contain locked files on Windows.
      watch: { ignored: ["**/tmp/**"] },
    },
  };
});
