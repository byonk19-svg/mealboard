import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const [defaultPort, ...playwrightArgs] = process.argv.slice(2);

if (!defaultPort || playwrightArgs.length === 0) {
  console.error(
    "Usage: node scripts/run-playwright-with-port.mjs <port> <playwright args...>"
  );
  process.exit(1);
}

const playwrightCommand = join(
  process.cwd(),
  "node_modules",
  "@playwright",
  "test",
  "cli.js"
);

if (!existsSync(playwrightCommand)) {
  console.error("Local Playwright binary was not found. Run npm install first.");
  process.exit(1);
}

const result = spawnSync(process.execPath, [playwrightCommand, "test", ...playwrightArgs], {
  env: {
    ...process.env,
    PLAYWRIGHT_PORT: process.env.PLAYWRIGHT_PORT || defaultPort
  },
  shell: false,
  stdio: "inherit"
});

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
