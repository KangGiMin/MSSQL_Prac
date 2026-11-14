import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const clientPort = Number(env.CLIENT_PORT || 5173);
  if (!Number.isInteger(clientPort) || clientPort < 1 || clientPort > 65535)
    throw new Error("CLIENT_PORT는 1~65535 사이의 정수여야 합니다.");
  const proxyHost =
    env.HOST === "::1"
      ? "[::1]"
      : ["0.0.0.0", "::"].includes(env.HOST)
        ? "127.0.0.1"
        : env.HOST || "127.0.0.1";
  return {
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
      host: "127.0.0.1",
      port: clientPort,
      strictPort: true,
      proxy: {
        "/api": `http://${proxyHost}:${env.PORT || 3001}`,
      },
      // Temporary browser profiles contain locked files on Windows.
      watch: { ignored: ["**/tmp/**"] },
    },
  };
});
