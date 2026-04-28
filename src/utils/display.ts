// src/utils/display.ts
import Table from "cli-table3";
import chalk from "chalk";

export interface Profile {
  id: string;
  name: string;
  gender: string;
  age: number;
  age_group: string;
  country_id: string;
  country_name: string;
  gender_probability?: number;
  country_probability?: number;
  sample_size?: number;
  created_at?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  links: {
    self: string;
    next: string | null;
    prev: string | null;
  };
}

export function printProfilesTable(
  profiles: Profile[],
  meta?: PaginationMeta,
): void {
  if (profiles.length === 0) {
    console.log(chalk.yellow("  No profiles found."));
    return;
  }

  const table = new Table({
    head: [
      chalk.cyan("ID (short)"),
      chalk.cyan("Name"),
      chalk.cyan("Gender"),
      chalk.cyan("Age"),
      chalk.cyan("Age Group"),
      chalk.cyan("Country"),
    ],
    style: {
      head: [],
      border: ["grey"],
    },
    colWidths: [14, 22, 10, 6, 14, 20],
  });

  for (const p of profiles) {
    table.push([
      chalk.dim(p.id.slice(0, 8) + "…"),
      chalk.white(p.name),
      p.gender === "male" ? chalk.blue("male") : chalk.magenta("female"),
      String(p.age),
      chalk.dim(p.age_group),
      `${p.country_name} ${chalk.dim(`(${p.country_id})`)}`,
    ]);
  }

  console.log(table.toString());

  if (meta) {
    console.log(
      chalk.dim(
        `  Page ${meta.page} of ${meta.total_pages}  ·  ${meta.total} total profiles`,
      ),
    );
    if (meta.links.prev || meta.links.next) {
      const nav: string[] = [];
      if (meta.links.prev) nav.push(chalk.dim("← prev available"));
      if (meta.links.next) nav.push(chalk.dim("→ next available"));
      console.log("  " + nav.join("   "));
    }
  }
}

export function printProfileDetail(profile: Profile): void {
  const table = new Table({
    style: { border: ["grey"] },
    colWidths: [26, 40],
  });

  const rows: [string, string][] = [
    [chalk.cyan("ID"), profile.id],
    [chalk.cyan("Name"), chalk.bold(profile.name)],
    [
      chalk.cyan("Gender"),
      profile.gender === "male"
        ? chalk.blue("male")
        : chalk.magenta("female"),
    ],
  ];

  if (profile.gender_probability !== undefined)
    rows.push([
      chalk.cyan("Gender Probability"),
      `${(profile.gender_probability * 100).toFixed(1)}%`,
    ]);
  if (profile.sample_size !== undefined)
    rows.push([chalk.cyan("Sample Size"), String(profile.sample_size)]);

  rows.push([chalk.cyan("Age"), String(profile.age)]);
  rows.push([chalk.cyan("Age Group"), profile.age_group]);
  rows.push([
    chalk.cyan("Country"),
    `${profile.country_name} (${profile.country_id})`,
  ]);

  if (profile.country_probability !== undefined)
    rows.push([
      chalk.cyan("Country Probability"),
      `${(profile.country_probability * 100).toFixed(1)}%`,
    ]);
  if (profile.created_at)
    rows.push([
      chalk.cyan("Created At"),
      new Date(profile.created_at).toLocaleString(),
    ]);

  for (const row of rows) table.push(row);
  console.log(table.toString());
}

export function printSuccess(message: string): void {
  console.log(chalk.green("✔ ") + message);
}

export function printError(message: string): void {
  console.error(chalk.red("✖ ") + message);
}

export function printInfo(message: string): void {
  console.log(chalk.blue("ℹ ") + message);
}

export function printWarning(message: string): void {
  console.log(chalk.yellow("⚠ ") + message);
}
