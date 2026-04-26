// src/commands/profiles.ts
import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import ora from "ora";
import { APIService } from "../services/api.js";
import { StorageService } from "../services/storage.js";

const API_URL = process.env.INSIGHTA_API_URL || "http://localhost:3000";

export function registerProfileCommands(program: Command) {
  const profilesCmd = program
    .command("profiles")
    .description("Manage profiles");

  // List profiles
  profilesCmd
    .command("list")
    .description("List profiles with filters")
    .option("-g, --gender <gender>", "Filter by gender (male/female)")
    .option("-c, --country <country>", "Filter by country code")
    .option(
      "-a, --age-group <group>",
      "Filter by age group (child/teenager/adult/senior)",
    )
    .option("--min-age <age>", "Minimum age", parseInt)
    .option("--max-age <age>", "Maximum age", parseInt)
    .option(
      "--sort-by <field>",
      "Sort field (age/created_at/gender_probability)",
    )
    .option("--order <order>", "Sort order (asc/desc)")
    .option("-p, --page <page>", "Page number", parseInt)
    .option("-l, --limit <limit>", "Items per page", parseInt)
    .action(async (options) => {
      const spinner = ora("Fetching profiles...").start();

      try {
        const api = new APIService(API_URL);
        const params: any = {};

        if (options.gender) params.gender = options.gender;
        if (options.country) params.country_id = options.country;
        if (options.ageGroup) params.age_group = options.ageGroup;
        if (options.minAge) params.min_age = options.minAge;
        if (options.maxAge) params.max_age = options.maxAge;
        if (options.sortBy) params.sort_by = options.sortBy;
        if (options.order) params.order = options.order;
        if (options.page) params.page = options.page;
        if (options.limit) params.limit = options.limit;

        const result = await api.get("/api/profiles", params);

        spinner.succeed(`Found ${result.total} profiles`);

        if (result.data.length === 0) {
          console.log(chalk.yellow("\nNo profiles found"));
          return;
        }

        // Display table
        const table = new Table({
          head: ["ID", "Name", "Gender", "Age", "Age Group", "Country"],
          colWidths: [36, 20, 10, 8, 12, 15],
        });

        result.data.forEach((profile: any) => {
          table.push([
            profile.id.substring(0, 8) + "...",
            profile.name,
            profile.gender,
            profile.age,
            profile.age_group,
            profile.country_name,
          ]);
        });

        console.log(table.toString());
        console.log(
          chalk.dim(
            `\nPage ${result.page} of ${result.total_pages} | Total: ${result.total} profiles`,
          ),
        );
      } catch (error: any) {
        spinner.fail("Failed to fetch profiles");
        console.error(
          chalk.red(error.response?.data?.message || error.message),
        );
      }
    });

  // Get profile by ID
  profilesCmd
    .command("get <id>")
    .description("Get profile by ID")
    .action(async (id) => {
      const spinner = ora("Fetching profile...").start();

      try {
        const api = new APIService(API_URL);
        const result = await api.get(`/api/profiles/${id}`);

        spinner.succeed("Profile found");

        const profile = result.data;
        console.log(chalk.bold("\n📊 Profile Details:"));
        console.log(chalk.cyan(`   ID: ${profile.id}`));
        console.log(chalk.cyan(`   Name: ${profile.name}`));
        console.log(
          chalk.cyan(
            `   Gender: ${profile.gender} (${(profile.gender_probability * 100).toFixed(1)}%)`,
          ),
        );
        console.log(
          chalk.cyan(`   Age: ${profile.age} (${profile.age_group})`),
        );
        console.log(
          chalk.cyan(
            `   Country: ${profile.country_name} (${profile.country_id})`,
          ),
        );
        console.log(chalk.cyan(`   Sample Size: ${profile.sample_size}`));
        console.log(
          chalk.cyan(
            `   Created: ${new Date(profile.created_at).toLocaleString()}`,
          ),
        );
      } catch (error: any) {
        spinner.fail("Failed to fetch profile");
        console.error(
          chalk.red(error.response?.data?.message || error.message),
        );
      }
    });

  // Create profile (admin only)
  profilesCmd
    .command("create")
    .description("Create a new profile (admin only)")
    .requiredOption("-n, --name <name>", "Person's name")
    .action(async (options) => {
      const spinner = ora("Creating profile...").start();

      try {
        const api = new APIService(API_URL);
        const result = await api.post("/api/profiles", { name: options.name });

        spinner.succeed("Profile created successfully");

        const profile = result.data;
        console.log(chalk.green(`\n✅ Created profile for ${profile.name}`));
        console.log(chalk.dim(`   ID: ${profile.id}`));
      } catch (error: any) {
        spinner.fail("Failed to create profile");
        console.error(
          chalk.red(error.response?.data?.message || error.message),
        );
      }
    });

  // Search profiles with NLP
  profilesCmd
    .command("search <query>")
    .description("Search profiles using natural language")
    .option("-p, --page <page>", "Page number", parseInt)
    .option("-l, --limit <limit>", "Items per page", parseInt)
    .action(async (query, options) => {
      const spinner = ora("Searching...").start();

      try {
        const api = new APIService(API_URL);
        const params: any = { q: query };
        if (options.page) params.page = options.page;
        if (options.limit) params.limit = options.limit;

        const result = await api.get("/api/profiles/search", params);

        spinner.succeed(`Found ${result.total} matching profiles`);

        if (result.data.length === 0) {
          console.log(chalk.yellow("\nNo profiles match your search"));
          return;
        }

        const table = new Table({
          head: ["Name", "Gender", "Age", "Country"],
          colWidths: [20, 10, 8, 15],
        });

        result.data.forEach((profile: any) => {
          table.push([
            profile.name,
            profile.gender,
            profile.age,
            profile.country_name,
          ]);
        });

        console.log(table.toString());
        console.log(chalk.dim(`\nQuery: "${query}"`));
      } catch (error: any) {
        spinner.fail("Search failed");
        console.error(
          chalk.red(error.response?.data?.message || error.message),
        );
      }
    });

  // Export profiles
  profilesCmd
    .command("export")
    .description("Export profiles to CSV")
    .option("-f, --format <format>", "Export format (csv)", "csv")
    .option("-g, --gender <gender>", "Filter by gender")
    .option("-c, --country <country>", "Filter by country code")
    .action(async (options) => {
      const spinner = ora("Exporting profiles...").start();

      try {
        const api = new APIService(API_URL);
        const params: any = { format: options.format };
        if (options.gender) params.gender = options.gender;
        if (options.country) params.country_id = options.country;

        const response = await api.get("/api/profiles/export", params);

        // Save to file
        const filename = `profiles_${Date.now()}.csv`;
        const fs = await import("fs");
        fs.writeFileSync(filename, response);

        spinner.succeed(`Exported to ${filename}`);
        console.log(chalk.green(`\n✅ Saved to ${process.cwd()}/${filename}`));
      } catch (error: any) {
        spinner.fail("Export failed");
        console.error(
          chalk.red(error.response?.data?.message || error.message),
        );
      }
    });

  // Delete profile (admin only)
  profilesCmd
    .command("delete <id>")
    .description("Delete a profile (admin only)")
    .action(async (id) => {
      const spinner = ora("Deleting profile...").start();

      try {
        const api = new APIService(API_URL);
        await api.delete(`/api/profiles/${id}`);

        spinner.succeed("Profile deleted successfully");
      } catch (error: any) {
        spinner.fail("Failed to delete profile");
        console.error(
          chalk.red(error.response?.data?.message || error.message),
        );
      }
    });
}
