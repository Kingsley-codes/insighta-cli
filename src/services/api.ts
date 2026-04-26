// src/services/api.ts
import axios, { AxiosInstance, AxiosError } from "axios";
import { StorageService } from "./storage.js";
import { AuthService } from "./auth.js";

export class APIService {
  private client: AxiosInstance;
  private storage: StorageService;
  private authService: AuthService;
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.storage = new StorageService();
    this.authService = new AuthService(baseURL);

    this.client = axios.create({
      baseURL,
      headers: {
        "X-API-Version": "1",
      },
    });

    // Request interceptor to add token
    this.client.interceptors.request.use(async (config) => {
      const credentials = this.storage.getCredentials();
      if (credentials) {
        config.headers.Authorization = `Bearer ${credentials.access_token}`;
      }
      return config;
    });

    // Response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;

        if (
          error.response?.status === 401 &&
          originalRequest &&
          !(originalRequest as any)._retry
        ) {
          (originalRequest as any)._retry = true;

          try {
            const credentials = this.storage.getCredentials();
            if (credentials) {
              const newTokens = await this.authService.refreshToken(
                credentials.refresh_token,
              );

              // Update stored credentials
              credentials.access_token = newTokens.access_token;
              credentials.refresh_token = newTokens.refresh_token;
              credentials.expires_at = Date.now() + 180 * 1000; // 3 minutes
              this.storage.saveCredentials(credentials);

              // Retry original request
              originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            console.error("Token refresh failed, please login again");
            this.storage.clearCredentials();
          }
        }

        return Promise.reject(error);
      },
    );
  }

  async get(endpoint: string, params?: any): Promise<any> {
    const response = await this.client.get(endpoint, { params });
    return response.data;
  }

  async post(endpoint: string, data?: any): Promise<any> {
    const response = await this.client.post(endpoint, data);
    return response.data;
  }

  async delete(endpoint: string): Promise<any> {
    const response = await this.client.delete(endpoint);
    return response.data;
  }
}
