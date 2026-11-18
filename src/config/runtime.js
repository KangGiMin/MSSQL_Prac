import { resolveApiConfig } from "../../shared/deployment.mjs";
export const staticSite = import.meta.env?.VITE_HOSTING === "github-pages";
export const { origin: apiOrigin, configured: apiConfigured } =
  resolveApiConfig({
    staticSite,
    apiBaseUrl: import.meta.env?.VITE_API_BASE_URL || "",
  });
export const engineLabel = "SQL Server";
export const assetUrl = (path) =>
  `${import.meta.env?.BASE_URL || "/"}${path.replace(/^\/+/, "")}`;
