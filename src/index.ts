#!/usr/bin/env node
// src/index.ts

// Load env vars from .env if present (for local dev)
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = join(__dirname, "..", ".env");
if (existsSync(envFile)) {
  const lines = readFileSync(envFile, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
}

import { Command } from "commander";
import chalk from "chalk";
import { registerAuthCommands } from "./commands/auth.js";
import { registerProfileCommands } from "./commands/profiles.js";

const program = new Command();

program
  .name("insighta")
  .description(
    chalk.bold("Insighta Labs+") +
      " — Profile Intelligence System CLI\n" +
      chalk.dim(
        "  Authenticate, query, and manage profiles from your terminal.",
      ),
  )
  .version("1.0.0", "-v, --version", "Output the current version");

registerAuthCommands(program);
registerProfileCommands(program);

// Friendly help footer
program.addHelpText(
  "after",
  `
${chalk.dim("Examples:")}
  ${chalk.cyan("insighta login")}                                  Authenticate with GitHub  ${chalk.cyan("insighta login-email -e user@example.com -p pass")}  Login with email/password
  ${chalk.cyan("insighta signup -e user@example.com -p pass -u username -r analyst")}  Create account  ${chalk.cyan("insighta profiles list")}                          List all profiles
  ${chalk.cyan("insighta profiles list --gender male --country NG")}  Filter profiles
  ${chalk.cyan('insighta profiles search "young males from nigeria"')}  NLP search
  ${chalk.cyan('insighta profiles create --name "Amara Nwosu"')}   Create a profile (admin)
  ${chalk.cyan("insighta profiles export --format csv")}             Export all profiles
  ${chalk.cyan("insighta whoami")}                                 Show current user
`,
);

program.parse(process.argv);
