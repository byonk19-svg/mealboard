import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";

const ownerEmail = process.env.MEALBOARD_E2E_EMAIL;
const memberEmail =
  process.env.MEALBOARD_E2E_MEMBER_EMAIL ??
  "mealboard-e2e-member-local@example.test";
const databaseContainer =
  process.env.MEALBOARD_E2E_DB_CONTAINER ?? "supabase_db_mealboard";

const env = { ...process.env };

if (!env.MEALBOARD_LOCAL_AUTH_USER_LOOKUP) {
  try {
    const emails = [ownerEmail, memberEmail].filter(Boolean);
    const rows = execFileSync(
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
        `select lower(email) || '|' || id from auth.users where lower(email) in (${emails.map(sqlString).join(",")})`
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    )
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter(Boolean);
    const usersByEmail = Object.fromEntries(
      rows
        .map((row) => row.split("|"))
        .filter((row) => row.length === 2)
    );

    if (Object.keys(usersByEmail).length > 0) {
      env.MEALBOARD_LOCAL_AUTH_USER_LOOKUP = JSON.stringify(usersByEmail);
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
