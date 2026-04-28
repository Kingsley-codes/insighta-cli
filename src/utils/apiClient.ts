// src/utils/apiClient.ts
import chalk from "chalk";
import {
  loadCredentials,
  saveCredentials,
  clearCredentials,
} from "./credentials.js";

const API_URL = process.env.INSIGHTA_API_URL || "http://localhost:4000";
const API_VERSION = "1.0";

interface ApiResponse<T = unknown> {
  status: "success" | "error";
  data?: T;
  message?: string;
  page?: number;
  limit?: number;
  total?: number;
  total_pages?: number;
  links?: {
    self: string;
    next: string | null;
    prev: string | null;
  };
}

async function refreshTokens(): Promise<boolean> {
  const creds = loadCredentials();
  if (!creds?.refresh_token) return false;

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: creds.refresh_token }),
    });

    if (!response.ok) return false;

    const data = (await response.json()) as ApiResponse<{
      access_token: string;
      refresh_token: string;
    }>;

    if (data.status === "success" && data.data) {
      saveCredentials({
        ...creds,
        access_token: data.data.access_token,
        refresh_token: data.data.refresh_token,
        saved_at: new Date().toISOString(),
      });
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function apiRequest<T = unknown>(
  method: string,
  path: string,
  options: {
    body?: unknown;
    query?: Record<string, string | number | undefined>;
    requiresAuth?: boolean;
    isProfileRoute?: boolean;
    responseType?: "json" | "text";
  } = {},
): Promise<{ data: T; raw: ApiResponse<T> }> {
  const {
    body,
    query,
    requiresAuth = true,
    isProfileRoute = false,
    responseType = "json",
  } = options;

  const buildUrl = (token?: string) => {
    const url = new URL(`${API_URL}${path}`);
    if (query) {
      for (const [key, val] of Object.entries(query)) {
        if (val !== undefined) url.searchParams.set(key, String(val));
      }
    }
    return url.toString();
  };

  const buildHeaders = (accessToken?: string) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (isProfileRoute) headers["X-API-Version"] = API_VERSION;
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    return headers;
  };

  const doRequest = async (accessToken?: string) => {
    const response = await fetch(buildUrl(), {
      method,
      headers: buildHeaders(accessToken),
      body: body ? JSON.stringify(body) : undefined,
    });
    return response;
  };

  let accessToken: string | undefined;

  if (requiresAuth) {
    const creds = loadCredentials();
    if (!creds) {
      console.error(
        chalk.red("✖ Not authenticated. Run `insighta login` first."),
      );
      throw new Error("Not authenticated. Run `insighta login` first.");
    }
    accessToken = creds.access_token;
  }

  let response = await doRequest(accessToken);

  // If 401, try token refresh once
  if (response.status === 401 && requiresAuth) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      const creds = loadCredentials();
      accessToken = creds?.access_token;
      response = await doRequest(accessToken);
    } else {
      clearCredentials();
      console.error(
        chalk.red(
          "✖ Session expired. Please run `insighta login` to authenticate again.",
        ),
      );
      throw new Error(
        "Session expired. Please run `insighta login` to authenticate again.",
      );
    }
  }

  if (responseType === "text") {
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Request failed (${response.status}): ${errText}`);
    }
    return { data: (await response.text()) as unknown as T, raw: {} as ApiResponse<T> };
  }

  const json = (await response.json()) as ApiResponse<T>;

  if (!response.ok || json.status === "error") {
    const msg = json.message || `HTTP ${response.status}`;
    throw new Error(msg);
  }

  return { data: json.data as T, raw: json };
}
