// src/services/storage.ts
import fs from "fs";
import os from "os";
import path from "path";

const CONFIG_DIR = path.join(os.homedir(), ".insighta");
const CREDENTIALS_FILE = path.join(CONFIG_DIR, "credentials.json");

export interface Credentials {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}

export class StorageService {
  private ensureConfigDir(): void {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
  }

  saveCredentials(credentials: Credentials): void {
    this.ensureConfigDir();
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2));
    fs.chmodSync(CREDENTIALS_FILE, 0o600); // Read/write only for owner
  }

  getCredentials(): Credentials | null {
    try {
      if (fs.existsSync(CREDENTIALS_FILE)) {
        const data = fs.readFileSync(CREDENTIALS_FILE, "utf-8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Failed to read credentials:", error);
    }
    return null;
  }

  clearCredentials(): void {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      fs.unlinkSync(CREDENTIALS_FILE);
    }
  }

  isTokenValid(credentials: Credentials): boolean {
    return Date.now() < credentials.expires_at;
  }
}
