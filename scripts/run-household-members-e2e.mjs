import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";

const ownerEmail = process.env.MEALBOARD_E2E_EMAIL;
const memberEmail =
  process.env.MEALBOARD_E2E_MEMBER_EMAIL ??
  "mealboard-e2e-member-local@example.test";
const memberPassword =
  process.env.MEALBOARD_E2E_MEMBER_PASSWORD ??
  "Mealboard-e2e-member-local-12345!";
const databaseContainer =
  process.env.MEALBOARD_E2E_DB_CONTAINER ?? "supabase_db_mealboard";

const env = { ...process.env };
env.MEALBOARD_E2E_MEMBER_EMAIL = memberEmail;
env.MEALBOARD_E2E_MEMBER_PASSWORD = memberPassword;
let bootstrapError = null;

try {
  execFileSync(process.execPath, ["scripts/bootstrap-local-e2e-user.mjs"], {
    env: {
      ...process.env,
      MEALBOARD_E2E_EMAIL: memberEmail,
      MEALBOARD_E2E_PASSWORD: memberPassword,
      MEALBOARD_E2E_SKIP_MEMBERSHIP: "true"
    },
    stdio: "inherit"
  });
} catch (error) {
  bootstrapError = error;
  console.warn(
    `Could not seed local household member auth user: ${getErrorMessage(error)}`
  );
}

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

    if (memberEmail && !usersByEmail[memberEmail.toLowerCase()]) {
      console.error(
        `Household member smoke setup could not find auth user ${memberEmail}.`
      );
      process.exit(1);
    }

    if (Object.keys(usersByEmail).length > 0) {
      env.MEALBOARD_LOCAL_AUTH_USER_LOOKUP = JSON.stringify(usersByEmail);
    }
  } catch (error) {
    console.warn(
      `Could not build local auth lookup for household member smoke: ${getErrorMessage(error)}`
    );

    if (bootstrapError) {
      process.exit(1);
    }
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

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
