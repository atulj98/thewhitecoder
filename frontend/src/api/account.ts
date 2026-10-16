import { useQuery } from "@tanstack/react-query";

export interface Account {
  user: { id: string; name: string; email: string };
  csrf_token: string;
}
export interface QuestionEntry {
  step_key: string;
  topic_key: string;
  item_key: string;
  completed: boolean;
  has_notes: boolean;
}
export interface Progress {
  sheet_slug: string;
  total: number;
  completed: number;
  question_keys: [string, string, string][];
  entries: QuestionEntry[];
}

export const googleClientId = (
  import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ""
).trim();
export const accountsEnabled = Boolean(googleClientId);
const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function accountRequest<T>(
  path: string,
  options: RequestInit = {},
  csrf?: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(base + "/api/v1" + path, {
      ...options,
      signal: options.signal
        ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError("Unable to connect to your account. Please retry.", 0);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      typeof body?.detail === "string"
        ? body.detail
        : "Unable to save. Please retry.",
      response.status,
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export function useAccount() {
  return useQuery({
    queryKey: ["account"],
    enabled: accountsEnabled,
    queryFn: async () => {
      try {
        return await accountRequest<Account>("/auth/me");
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
    staleTime: 0,
  });
}

export function questionKey(step: string, topic: string, item: string) {
  return JSON.stringify([step, topic, item]);
}

export function progressPath(slug: string, ...parts: string[]) {
  return "/me/progress/" + [slug, ...parts].map(encodeURIComponent).join("/");
}
