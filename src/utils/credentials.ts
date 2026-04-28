// src/utils/credentials.ts
import fs from "fs";
import path from "path";
import os from "os";

export interface Credentials {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    username: string;
    email: string | null;
    role: string;
    avatar_url: string | null;
  };
  saved_at: string;
}

const CREDENTIALS_DIR = path.join(os.homedir(), ".insighta");
const CREDENTIALS_FILE = path.join(CREDENTIALS_DIR, "credentials.json");

export function saveCredentials(credentials: Credentials): void {
  if (!fs.existsSync(CREDENTIALS_DIR)) {
    fs.mkdirSync(CREDENTIALS_DIR, { recursive: true, mode: 0o700 });
  }
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), {
    mode: 0o600, // owner read/write only
  });
}

export function loadCredentials(): Credentials | null {
  try {
    if (!fs.existsSync(CREDENTIALS_FILE)) return null;
    const raw = fs.readFileSync(CREDENTIALS_FILE, "utf-8");
    return JSON.parse(raw) as Credentials;
  } catch {
    return null;
  }
}

export function clearCredentials(): void {
  if (fs.existsSync(CREDENTIALS_FILE)) {
    fs.unlinkSync(CREDENTIALS_FILE);
  }
}

export function hasCredentials(): boolean {
  return fs.existsSync(CREDENTIALS_FILE);
}
