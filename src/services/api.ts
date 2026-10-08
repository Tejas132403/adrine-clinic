import axios, { type AxiosError } from "axios";
import type { ApiErrorResponse } from "@/types";

/**
 * One axios instance for the whole app. It normalises every failure into an
 * ApiError, so UI code can rely on `error.message` and `error.fieldError(...)`
 * instead of inspecting axios internals.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(message: string, status: number, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  /** First validation message for a form field, if the API returned one. */
  fieldError(field: string): string | undefined {
    return this.fieldErrors?.[field]?.[0];
  }
}

export const apiClient = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  // The browser sends the httpOnly session cookie; API clients may instead
  // send `Authorization: Bearer <token>`.
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status ?? 0;
    const payload = error.response?.data;
    const message =
      payload?.message ??
      (status === 0
        ? "Unable to reach the clinic server. Check your connection and try again."
        : `Request failed (${status})`);

    // An expired or missing session should drop the user back to login.
    if (status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.assign("/login");
    }

    return Promise.reject(new ApiError(message, status, payload?.errors));
  },
);

type Envelope<T> = { success: true; data: T; meta?: unknown };

export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const response = await apiClient.get<Envelope<T>>(url, { params });
  return response.data.data;
}

export async function apiGetWithMeta<T, M>(
  url: string,
  params?: Record<string, unknown>,
): Promise<{ data: T; meta: M }> {
  const response = await apiClient.get<Envelope<T>>(url, { params });
  return { data: response.data.data, meta: (response.data.meta ?? {}) as M };
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const response = await apiClient.post<Envelope<T>>(url, body);
  return response.data.data;
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const response = await apiClient.put<Envelope<T>>(url, body);
  return response.data.data;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const response = await apiClient.patch<Envelope<T>>(url, body);
  return response.data.data;
}
