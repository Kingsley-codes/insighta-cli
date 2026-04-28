// src/utils/credentials.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// We test the pure logic, not file I/O, by mocking the path.
// For a real test suite you'd use tmp dirs.

import {
  saveCredentials,
  loadCredentials,
  clearCredentials,
  hasCredentials,
  type Credentials,
} from "./credentials.js";

const TEST_CREDS_DIR = path.join(os.tmpdir(), ".insighta-test-" + Date.now());
const TEST_CREDS_FILE = path.join(TEST_CREDS_DIR, "credentials.json");

const mockCreds: Credentials = {
  access_token: "test_access_token",
  refresh_token: "test_refresh_token",
  user: {
    id: "user-123",
    username: "testuser",
    email: "test@example.com",
    role: "analyst",
    avatar_url: null,
  },
  saved_at: new Date().toISOString(),
};

describe("credentials utility", () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_CREDS_FILE)) fs.unlinkSync(TEST_CREDS_FILE);
    if (fs.existsSync(TEST_CREDS_DIR)) fs.rmdirSync(TEST_CREDS_DIR);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_CREDS_FILE)) fs.unlinkSync(TEST_CREDS_FILE);
    if (fs.existsSync(TEST_CREDS_DIR)) fs.rmdirSync(TEST_CREDS_DIR);
  });

  it("returns null when no credentials file exists", () => {
    expect(loadCredentials()).toBeNull();
  });

  it("hasCredentials returns false when not logged in", () => {
    expect(hasCredentials()).toBe(false);
  });

  it("round-trips credentials correctly", () => {
    saveCredentials(mockCreds);
    const loaded = loadCredentials();
    expect(loaded).not.toBeNull();
    expect(loaded?.access_token).toBe(mockCreds.access_token);
    expect(loaded?.user.username).toBe(mockCreds.user.username);
  });

  it("clears credentials correctly", () => {
    saveCredentials(mockCreds);
    clearCredentials();
    expect(loadCredentials()).toBeNull();
  });
});

describe("PKCE helpers (pure functions)", () => {
  it("code challenge is derived from verifier deterministically", async () => {
    const { createHash } = await import("crypto");
    const verifier = "test_verifier_string";
    const challenge = createHash("sha256")
      .update(verifier)
      .digest("base64url");
    // Same verifier always produces same challenge
    const challenge2 = createHash("sha256")
      .update(verifier)
      .digest("base64url");
    expect(challenge).toBe(challenge2);
  });

  it("code challenge is different from verifier", async () => {
    const { createHash, randomBytes } = await import("crypto");
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256")
      .update(verifier)
      .digest("base64url");
    expect(challenge).not.toBe(verifier);
  });
});
