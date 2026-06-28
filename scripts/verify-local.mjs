import { spawnSync } from "node:child_process";

const npmExecPath = process.env.npm_execpath;
const npmCommand = npmExecPath ? process.execPath : "npm";
const npmArgsPrefix = npmExecPath ? [npmExecPath] : [];
const requestedE2eScripts = [];

for (const arg of process.argv.slice(2)) {
  if (arg === "--help" || arg === "-h") {
    printHelp();
    process.exit(0);
  }

  if (arg.startsWith("--e2e=")) {
    const scriptName = arg.slice("--e2e=".length).trim();

    if (!scriptName) {
      console.error("Expected an npm script name after --e2e=.");
      process.exit(1);
    }

    requestedE2eScripts.push(scriptName);
    continue;
  }

  console.error(`Unknown argument: ${arg}`);
  printHelp();
  process.exit(1);
}

const steps = [
  {
    args: [...npmArgsPrefix, "test"],
    command: npmCommand,
    displayCommand: "npm test",
    label: "unit and integration tests"
  },
  {
    args: [...npmArgsPrefix, "run", "lint"],
    command: npmCommand,
    displayCommand: "npm run lint",
    label: "lint"
  },
  {
    args: [...npmArgsPrefix, "run", "typecheck"],
    command: npmCommand,
    displayCommand: "npm run typecheck",
    label: "typecheck"
  },
  {
    args: [...npmArgsPrefix, "run", "build"],
    command: npmCommand,
    displayCommand: "npm run build",
    label: "production build"
  },
  ...requestedE2eScripts.map((scriptName) => ({
    args: [...npmArgsPrefix, "run", scriptName],
    command: npmCommand,
    displayCommand: `npm run ${scriptName}`,
    label: scriptName
  })),
  {
    args: ["diff", "--check"],
    command: "git",
    displayCommand: "git diff --check",
    label: "git diff whitespace check"
  }
];

for (const step of steps) {
  runStep(step);
}

console.log(
  requestedE2eScripts.length > 0
    ? "Verification passed, including requested E2E scripts."
    : "Verification passed."
);

function runStep({
  args,
  command,
  displayCommand,
  label
}) {
  console.log(`\n==> ${label}`);
  console.log(`$ ${displayCommand}`);

  const result = spawnSync(command, args, {
    shell: false,
    stdio: "inherit"
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`Verification failed during ${label}: ${displayCommand}`);
    process.exit(result.status ?? 1);
  }
}

function printHelp() {
  console.log(`Usage: node scripts/verify-local.mjs [--e2e=<npm-script> ...]

Runs the repo-standard local verification sequence:
  npm test
  npm run lint
  npm run typecheck
  npm run build
  optional requested E2E npm scripts
  git diff --check

Examples:
  npm run verify
  npm run verify -- --e2e=e2e:pantry
  npm run verify -- --e2e=e2e:smoke --e2e=e2e:grocery-mobile`);
}
