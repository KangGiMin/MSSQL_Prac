import { spawn } from "node:child_process";
import fs from "node:fs/promises";
const child = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "build"],
  {
    stdio: "inherit",
    windowsHide: true,
    env: {
      ...process.env,
      VITE_HOSTING: "github-pages",
      VITE_BASE_PATH: process.env.VITE_BASE_PATH || "/MSSQL_Prac/",
    },
  },
);
const code = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", resolve);
});
if (code !== 0) process.exitCode = code || 1;
else await fs.writeFile("dist/.nojekyll", "");
