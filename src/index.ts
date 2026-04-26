#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { registerProfileCommands } from "./commands/profiles.js";
import { AuthService } from "./services/auth.js";
import { StorageService } from "./services/storage.js";

const program = new Command();
const API_URL = process.env.INSIGHTA_API_URL || "http://localhost:3000";
const authService = new AuthService(API_URL);
const storage = new StorageService();

program
  .name("insighta")
  .description("CLI for Insighta Labs+ - Profile Intelligence Platform")
  .version("1.0.0");

// Auth commands
program
  .command("login")
  .description("Login with GitHub OAuth")
  .action(async () => {
    try {
      await authService.login();
    } catch (error: any) {
      console.error(chalk.red(`Login failed: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command("logout")
  .description("Logout and clear credentials")
  .action(async () => {
    await authService.logout();
  });

program
  .command("whoami")
  .description("Show current logged-in user")
  .action(async () => {
    await authService.whoami();
  });

// Register profile commands
registerProfileCommands(program);

// Check authentication before any command except login
program.hook("preAction", (thisCommand) => {
  const commandName = thisCommand.args[0];

  if (commandName !== "login") {
    const credentials = storage.getCredentials();
    if (!credentials) {
      console.error(chalk.red("❌ Not logged in. Please run: insighta login"));
      process.exit(1);
    }
  }
});

program.parse();
