// src/commands/auth.ts
import http from "http";
import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import open from "open";
import crypto from "crypto";
import {
  saveCredentials,
  loadCredentials,
  clearCredentials,
} from "../utils/credentials.js";
import { apiRequest } from "../utils/apiClient.js";
import { printSuccess, printError, printInfo } from "../utils/display.js";

const API_URL = process.env.INSIGHTA_API_URL || "http://localhost:4000";
const CALLBACK_PORT = 9876;
const CALLBACK_PATH = "/callback";

// Local callback server to receive GitHub OAuth code
function startCallbackServer(
  expectedState: string,
  codeVerifier: string,
): Promise<{ code: string; state: string }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => {
        server.close();
        reject(new Error("Authentication timed out (2 minutes)"));
      },
      2 * 60 * 1000,
    );

    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url || "/", `http://localhost:${CALLBACK_PORT}`);

      if (url.pathname !== CALLBACK_PATH) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      const htmlPage = (title: string, message: string, success: boolean) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0d1117; color: #c9d1d9;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #161b22; border: 1px solid #30363d;
      border-radius: 12px; padding: 40px 48px;
      text-align: center; max-width: 420px;
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 600; margin-bottom: 8px;
      color: ${success ? "#3fb950" : "#f85149"}; }
    p { color: #8b949e; font-size: 14px; line-height: 1.6; }
    .brand { font-size: 12px; color: #484f58; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? "✅" : "❌"}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <p class="brand">Insighta Labs+</p>
  </div>
</body>
</html>`;

      if (error) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          htmlPage(
            "Authentication Failed",
            `GitHub returned an error: ${error}. You can close this tab.`,
            false,
          ),
        );
        clearTimeout(timeout);
        server.close();
        reject(new Error(`GitHub OAuth error: ${error}`));
        return;
      }

      if (!code || !state) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(
          htmlPage(
            "Bad Request",
            "Missing code or state parameter. You can close this tab.",
            false,
          ),
        );
        clearTimeout(timeout);
        server.close();
        reject(new Error("Missing code or state in callback"));
        return;
      }

      if (state !== expectedState) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(
          htmlPage(
            "Invalid State",
            "State mismatch — possible CSRF. You can close this tab.",
            false,
          ),
        );
        clearTimeout(timeout);
        server.close();
        reject(new Error("State mismatch"));
        return;
      }

      // Forward the code and PKCE verifier to the backend's unified callback
      try {
        const callbackUrl = new URL(`${API_URL}/auth/github/callback`);
        callbackUrl.searchParams.set("code", code);
        callbackUrl.searchParams.set("state", state);

        // Send code_verifier and client_type to backend
        const response = await fetch(callbackUrl.toString(), {
          method: "POST", // Using POST to send sensitive data in body
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code_verifier: codeVerifier,
            client_type: "cli",
          }),
        });

        const data = await response.json();

        if (data.status !== "success") {
          throw new Error(data.message || "Failed to authenticate");
        }

        // Save credentials
        saveCredentials({
          access_token: data.data.access_token,
          refresh_token: data.data.refresh_token,
          user: data.data.user,
          saved_at: new Date().toISOString(),
        });

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          htmlPage(
            "Login Successful!",
            "You are now logged in to Insighta Labs+. You can close this tab and return to your terminal.",
            true,
          ),
        );

        clearTimeout(timeout);
        server.close();
        resolve({ code, state });
      } catch (err: any) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          htmlPage(
            "Authentication Failed",
            err.message ||
              "Failed to complete authentication. You can close this tab.",
            false,
          ),
        );
        clearTimeout(timeout);
        server.close();
        reject(err);
      }
    });

    server.listen(CALLBACK_PORT, "127.0.0.1", () => {});

    server.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timeout);
      if (err.code === "EADDRINUSE") {
        reject(
          new Error(
            `Port ${CALLBACK_PORT} is already in use. Please free it and try again.`,
          ),
        );
      } else {
        reject(err);
      }
    });
  });
}

export async function loginCommand(): Promise<void> {
  const existing = loadCredentials();
  if (existing) {
    printInfo(
      `Already logged in as ${chalk.bold("@" + existing.user.username)}. ` +
        `Run ${chalk.cyan("insighta logout")} first to switch accounts.`,
    );
    return;
  }

  const spinner = ora("Initiating GitHub authentication…").start();

  try {
    // Get GitHub OAuth URL from backend (using ?client=cli)
    const initResponse = await fetch(`${API_URL}/auth/github?client=cli`);
    const initData = await initResponse.json();

    if (initData.status !== "success" || !initData.data?.url) {
      throw new Error("Backend did not return a valid GitHub OAuth URL");
    }

    // For CLI flow, the backend returns state and codeVerifier in the response
    const { url, state, codeVerifier } = initData.data;

    spinner.succeed("GitHub OAuth URL ready");
    console.log();
    console.log(chalk.bold("  Opening GitHub login in your browser…"));
    console.log(
      chalk.dim(
        `  If it doesn't open automatically, visit:\n  ${chalk.cyan(url)}`,
      ),
    );
    console.log();

    // Start local server and open browser
    const waitSpinner = ora("Waiting for GitHub callback…").start();
    const callbackPromise = startCallbackServer(state, codeVerifier);

    await open(url);

    await callbackPromise;

    waitSpinner.succeed("Authentication successful");

    const creds = loadCredentials();
    if (creds) {
      console.log();
      printSuccess(
        `Logged in as ${chalk.bold.green("@" + creds.user.username)} ` +
          chalk.dim(`(${creds.user.role})`),
      );
    }
  } catch (error: any) {
    spinner.fail("Authentication failed");
    printError(error.message || "Unknown error during login");
    process.exit(1);
  }
}

export async function logoutCommand(): Promise<void> {
  const creds = loadCredentials();

  if (!creds) {
    printInfo("You are not logged in.");
    return;
  }

  const spinner = ora("Logging out…").start();

  try {
    await apiRequest("POST", "/auth/logout", {
      body: { refresh_token: creds.refresh_token },
      requiresAuth: true,
    });
  } catch {
    // If server-side revocation fails, still clear local credentials
  }

  clearCredentials();
  spinner.succeed("Logged out successfully");
}

export async function whoamiCommand(): Promise<void> {
  const creds = loadCredentials();

  if (!creds) {
    printError("Not authenticated. Run `insighta login` first.");
    process.exit(1);
  }

  const spinner = ora("Fetching user info…").start();

  try {
    const { data } = await apiRequest<{
      id: string;
      username: string;
      email: string | null;
      role: string;
      avatar_url: string | null;
    }>("GET", "/auth/me", { requiresAuth: true });

    spinner.stop();

    const { default: Table } = await import("cli-table3");
    const table = new Table({
      style: { border: ["grey"] },
      colWidths: [20, 40],
    });

    table.push(
      [chalk.cyan("Username"), chalk.bold("@" + data.username)],
      [chalk.cyan("Email"), data.email || chalk.dim("(not set)")],
      [
        chalk.cyan("Role"),
        data.role === "admin" ? chalk.red("admin") : chalk.blue("analyst"),
      ],
      [chalk.cyan("User ID"), chalk.dim(data.id)],
    );

    console.log(table.toString());
  } catch (error: any) {
    spinner.fail("Failed to fetch user info");
    printError(error.message);
    process.exit(1);
  }
}

export function registerAuthCommands(program: Command): void {
  program
    .command("login")
    .description("Authenticate with GitHub OAuth")
    .action(loginCommand);

  program
    .command("logout")
    .description("Revoke session and clear local credentials")
    .action(logoutCommand);

  program
    .command("whoami")
    .description("Display the currently authenticated user")
    .action(whoamiCommand);
}
