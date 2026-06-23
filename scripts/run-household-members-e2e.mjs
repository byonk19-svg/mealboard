import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";

const memberEmail =
  process.env.MEALBOARD_E2E_MEMBER_EMAIL ??
  "mealboard-e2e-member-local@example.test";
const databaseContainer =
  process.env.MEALBOARD_E2E_DB_CONTAINER ?? "supabase_db_mealboard";

const env = { ...process.env };

if (!env.MEALBOARD_LOCAL_AUTH_USER_LOOKUP) {
  try {
    const memberUserId = execFileSync(
      "docker",
      [
        "exec",
        databaseContainer,
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-t",
        "-A",
        "-c",
        `select id from auth.users where lower(email) = lower(${sqlString(memberEmail)}) limit 1`
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    ).trim();

    if (memberUserId) {
      env.MEALBOARD_LOCAL_AUTH_USER_LOOKUP = JSON.stringify({
        [memberEmail]: memberUserId
      });
    }
  } catch {
    // Production-like environments can still pass if Supabase auth admin works.
  }
}

const runner = join(process.cwd(), "scripts", "run-playwright-with-port.mjs");
const result = spawnSync(
  process.execPath,
  [
    runner,
    "3108",
    "e2e/household-members.smoke.spec.ts",
    "--project=chromium"
  ],
  {
    env,
    shell: false,
    stdio: "inherit"
  }
);

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);

function sqlString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}
