import type {
  AdminLoginResponse,
  IpAllowlistResponse,
  RateLimitResponse,
  RateLimitRule,
  RouteRateLimitRule,
} from "./types/api";

export type {
  AdminLoginResponse,
  IpAllowlistResponse,
  RateLimitResponse,
  RateLimitRule,
  RouteRateLimitRule,
};

type ApiError = {
  error?: {
    code?: string;
    message?: string;
  };
};

export async function login(
  username: string,
  password: string
): Promise<AdminLoginResponse> {
  return request<AdminLoginResponse>("/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function fetchIpAllowlist(
  token: string
): Promise<IpAllowlistResponse> {
  return request<IpAllowlistResponse>("/api/admin/ip-allowlist", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function updateIpAllowlist(
  token: string,
  ips: string[]
): Promise<IpAllowlistResponse> {
  return request<IpAllowlistResponse>("/api/admin/ip-allowlist", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ips }),
  });
}

export async function fetchRateLimit(
  token: string
): Promise<RateLimitResponse> {
  return request<RateLimitResponse>("/api/admin/rate-limit", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function updateRateLimit(
  token: string,
  payload: {
    globalRule: RateLimitRule | null;
    routeRules: RouteRateLimitRule[];
  }
): Promise<RateLimitResponse> {
  return request<RateLimitResponse>("/api/admin/rate-limit", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorBody = (await safeParseJson(response)) as ApiError | undefined;
    throw new Error(
      errorBody?.error?.message ?? `${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as T;
}

async function safeParseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}
