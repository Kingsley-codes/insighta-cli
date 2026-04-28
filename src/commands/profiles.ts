// src/commands/profiles.ts
import fs from "fs";
import path from "path";
import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import { apiRequest } from "../utils/apiClient.js";
import {
  printProfilesTable,
  printProfileDetail,
  printSuccess,
  printError,
  printInfo,
  type Profile,
  type PaginationMeta,
} from "../utils/display.js";

// ─── profiles list ──────────────────────────────────────────────────────────

interface ListOptions {
  gender?: string;
  country?: string;
  ageGroup?: string;
  minAge?: string;
  maxAge?: string;
  sortBy?: string;
  order?: string;
  page?: string;
  limit?: string;
}

export async function profilesListCommand(opts: ListOptions): Promise<void> {
  const spinner = ora("Fetching profiles…").start();

  try {
    const query: Record<string, string | number | undefined> = {};

    if (opts.gender) query.gender = opts.gender;
    if (opts.country) query.country_id = opts.country;
    if (opts.ageGroup) query.age_group = opts.ageGroup;
    if (opts.minAge) query.min_age = opts.minAge;
    if (opts.maxAge) query.max_age = opts.maxAge;
    if (opts.sortBy) query.sort_by = opts.sortBy;
    if (opts.order) query.order = opts.order;
    if (opts.page) query.page = opts.page;
    if (opts.limit) query.limit = opts.limit;

    const { data, raw } = await apiRequest<Profile[]>("GET", "/api/profiles", {
      query,
      isProfileRoute: true,
    });

    spinner.stop();

    const meta: PaginationMeta | undefined =
      raw.page !== undefined
        ? {
            page: raw.page!,
            limit: raw.limit!,
            total: raw.total!,
            total_pages: raw.total_pages!,
            links: raw.links!,
          }
        : undefined;

    printProfilesTable(data, meta);
  } catch (error: any) {
    spinner.fail("Failed to fetch profiles");
    printError(error.message);
    process.exit(1);
  }
}

// ─── profiles get <id> ──────────────────────────────────────────────────────

export async function profilesGetCommand(id: string): Promise<void> {
  const spinner = ora(`Fetching profile ${chalk.cyan(id)}…`).start();

  try {
    const { data } = await apiRequest<Profile>(
      "GET",
      `/api/profiles/${id}`,
      { isProfileRoute: true },
    );

    spinner.stop();
    printProfileDetail(data);
  } catch (error: any) {
    spinner.fail("Profile not found");
    printError(error.message);
    process.exit(1);
  }
}

// ─── profiles search <query> ────────────────────────────────────────────────

interface SearchOptions {
  page?: string;
  limit?: string;
}

export async function profilesSearchCommand(
  query: string,
  opts: SearchOptions,
): Promise<void> {
  const spinner = ora(`Searching: "${chalk.italic(query)}"…`).start();

  try {
    const params: Record<string, string | number | undefined> = { q: query };
    if (opts.page) params.page = opts.page;
    if (opts.limit) params.limit = opts.limit;

    const { data, raw } = await apiRequest<Profile[]>(
      "GET",
      "/api/profiles/search",
      { query: params, isProfileRoute: true },
    );

    spinner.stop();

    console.log(chalk.dim(`  Query: "${query}"`));
    console.log();

    const meta: PaginationMeta | undefined =
      raw.page !== undefined
        ? {
            page: raw.page!,
            limit: raw.limit!,
            total: raw.total!,
            total_pages: raw.total_pages!,
            links: raw.links!,
          }
        : undefined;

    printProfilesTable(data, meta);
  } catch (error: any) {
    spinner.fail("Search failed");
    printError(error.message);
    process.exit(1);
  }
}

// ─── profiles create ────────────────────────────────────────────────────────

interface CreateOptions {
  name: string;
}

export async function profilesCreateCommand(
  opts: CreateOptions,
): Promise<void> {
  if (!opts.name || !opts.name.trim()) {
    printError("Name is required. Use: insighta profiles create --name \"Full Name\"");
    process.exit(1);
  }

  const spinner = ora(
    `Creating profile for ${chalk.bold(opts.name)}… (this may take a few seconds)`,
  ).start();

  try {
    const { data } = await apiRequest<Profile>("POST", "/api/profiles", {
      body: { name: opts.name.trim() },
      isProfileRoute: true,
    });

    spinner.succeed(`Profile created for ${chalk.bold(data.name)}`);
    console.log();
    printProfileDetail(data);
  } catch (error: any) {
    spinner.fail("Failed to create profile");
    printError(error.message);
    process.exit(1);
  }
}

// ─── profiles export ────────────────────────────────────────────────────────

interface ExportOptions {
  format: string;
  gender?: string;
  country?: string;
  ageGroup?: string;
  minAge?: string;
  maxAge?: string;
  sortBy?: string;
  order?: string;
}

export async function profilesExportCommand(
  opts: ExportOptions,
): Promise<void> {
  if (opts.format !== "csv") {
    printError("Only CSV format is currently supported.");
    process.exit(1);
  }

  const spinner = ora("Exporting profiles as CSV…").start();

  try {
    const query: Record<string, string | number | undefined> = {
      format: "csv",
    };

    if (opts.gender) query.gender = opts.gender;
    if (opts.country) query.country_id = opts.country;
    if (opts.ageGroup) query.age_group = opts.ageGroup;
    if (opts.minAge) query.min_age = opts.minAge;
    if (opts.maxAge) query.max_age = opts.maxAge;
    if (opts.sortBy) query.sort_by = opts.sortBy;
    if (opts.order) query.order = opts.order;

    const { data: csvContent } = await apiRequest<string>(
      "GET",
      "/api/profiles/export",
      { query, isProfileRoute: true, responseType: "text" },
    );

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `profiles_${timestamp}.csv`;
    const outputPath = path.join(process.cwd(), filename);

    fs.writeFileSync(outputPath, csvContent as string, "utf-8");

    spinner.succeed("Export complete");
    printSuccess(`Saved to: ${chalk.cyan(outputPath)}`);
  } catch (error: any) {
    spinner.fail("Export failed");
    printError(error.message);
    process.exit(1);
  }
}

// ─── Register commands ──────────────────────────────────────────────────────

export function registerProfileCommands(program: Command): void {
  const profiles = program
    .command("profiles")
    .description("Manage and query profiles");

  profiles
    .command("list")
    .description("List all profiles with optional filters")
    .option("--gender <gender>", "Filter by gender (male|female)")
    .option("--country <code>", "Filter by country ISO code (e.g. NG)")
    .option(
      "--age-group <group>",
      "Filter by age group (teenager|adult|senior)",
    )
    .option("--min-age <age>", "Filter by minimum age")
    .option("--max-age <age>", "Filter by maximum age")
    .option(
      "--sort-by <field>",
      "Sort field (age|created_at|gender_probability)",
      "created_at",
    )
    .option("--order <dir>", "Sort direction (asc|desc)", "asc")
    .option("--page <n>", "Page number", "1")
    .option("--limit <n>", "Results per page (max 50)", "10")
    .action(profilesListCommand);

  profiles
    .command("get <id>")
    .description("Get a profile by ID")
    .action(profilesGetCommand);

  profiles
    .command("search <query>")
    .description('Search profiles using natural language (e.g. "young males from nigeria")')
    .option("--page <n>", "Page number", "1")
    .option("--limit <n>", "Results per page", "10")
    .action(profilesSearchCommand);

  profiles
    .command("create")
    .description("Create a new profile (admin only)")
    .requiredOption("--name <name>", "Full name for the profile")
    .action(profilesCreateCommand);

  profiles
    .command("export")
    .description("Export profiles to a file")
    .requiredOption("--format <fmt>", "Export format (csv)")
    .option("--gender <gender>", "Filter by gender")
    .option("--country <code>", "Filter by country ISO code")
    .option("--age-group <group>", "Filter by age group")
    .option("--min-age <age>", "Minimum age filter")
    .option("--max-age <age>", "Maximum age filter")
    .option("--sort-by <field>", "Sort field")
    .option("--order <dir>", "Sort direction (asc|desc)")
    .action(profilesExportCommand);
}
