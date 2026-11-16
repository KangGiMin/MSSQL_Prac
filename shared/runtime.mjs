// Defaults shared by the API, Vite, and verification tools.
export const network = {
  host: "127.0.0.1",
  apiPort: 3001,
  clientPort: 5173,
  apiPrefix: "/api",
};

export function isValidPort(port) {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

export function proxyHost(host) {
  if (host === "::1") return "[::1]";
  return ["0.0.0.0", "::"].includes(host) ? network.host : host || network.host;
}

export const clientUrl = (env = {}) =>
  `http://${network.host}:${env.CLIENT_PORT || network.clientPort}`;
