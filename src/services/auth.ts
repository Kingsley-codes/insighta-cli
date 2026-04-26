// src/services/auth.ts
import axios from "axios";
import open from "open";
import http from "http";
import { StorageService } from "./storage.js";

export class AuthService {
  private baseURL: string;
  private storage: StorageService;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.storage = new StorageService();
  }

  async login(): Promise<void> {
    // Get auth URL from backend
    const response = await axios.get(`${this.baseURL}/auth/github`);
    const { url, state, codeVerifier } = response.data.data;

    // Start local callback server
    const code = await this.startCallbackServer(state);

    // Exchange code for tokens
    const tokenResponse = await axios.get(
      `${this.baseURL}/auth/github/callback`,
      {
        params: { code, state },
        paramsSerializer: (params) => {
          // Pass code_verifier as well
          return `${new URLSearchParams(params).toString()}&code_verifier=${codeVerifier}`;
        },
      },
    );

    const { access_token, refresh_token, user } = tokenResponse.data.data;

    // Save credentials
    this.storage.saveCredentials({
      access_token,
      refresh_token,
      expires_at: Date.now() + 180 * 1000, // 3 minutes
      user,
    });

    console.log(`\n✅ Logged in as @${user.username} (${user.role})`);
  }

  private startCallbackServer(state: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        const url = new URL(req.url || "", `http://localhost:3001`);
        const code = url.searchParams.get("code");
        const receivedState = url.searchParams.get("state");

        if (receivedState !== state) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<h1>Invalid state parameter</h1>");
          reject(new Error("Invalid state parameter"));
          server.close();
          return;
        }

        if (code) {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <body>
                <h1>✅ Authentication Successful!</h1>
                <p>You can close this window and return to the CLI.</p>
                <script>window.close();</script>
              </body>
            </html>
          `);
          server.close();
          resolve(code);
        } else {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<h1>Missing authorization code</h1>");
          reject(new Error("Missing authorization code"));
          server.close();
        }
      });

      server.listen(3001, () => {
        console.log("\n🔐 Opening browser for GitHub authentication...");
        open(`http://localhost:3001/auth/github?state=${state}`);
      });

      setTimeout(() => {
        server.close();
        reject(new Error("Authentication timeout"));
      }, 120000); // 2 minute timeout
    });
  }

  async logout(): Promise<void> {
    const credentials = this.storage.getCredentials();
    if (credentials) {
      try {
        await axios.post(`${this.baseURL}/auth/logout`, {
          refresh_token: credentials.refresh_token,
        });
      } catch (error) {
        // Ignore errors on logout
      }
    }
    this.storage.clearCredentials();
    console.log("✅ Logged out successfully");
  }

  async whoami(): Promise<void> {
    const credentials = this.storage.getCredentials();
    if (!credentials) {
      console.log("❌ Not logged in. Run `insighta login` first.");
      return;
    }

    console.log(`\n📊 User Information:`);
    console.log(`   Username: ${credentials.user.username}`);
    console.log(`   Email: ${credentials.user.email || "Not provided"}`);
    console.log(`   Role: ${credentials.user.role}`);
    console.log(`   User ID: ${credentials.user.id}`);
  }

  async refreshToken(refreshToken: string): Promise<any> {
    const response = await axios.post(`${this.baseURL}/auth/refresh`, {
      refresh_token: refreshToken,
    });
    return response.data.data;
  }
}
