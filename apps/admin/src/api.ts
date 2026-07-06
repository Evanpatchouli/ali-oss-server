import type {
  AdminUploadResponse,
  BucketObjectsResponse,
  AdminLoginResponse,
  IpAllowlistResponse,
  RateLimitResponse,
  RateLimitRule,
  RouteRateLimitRule,
} from "./types/api";

export type {
  AdminUploadResponse,
  BucketObjectsResponse,
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

export async function uploadAdminFile(
  token: string,
  payload: {
    directory: string;
    filename: string;
    file: File;
  }
): Promise<AdminUploadResponse> {
  const formData = new FormData();
  formData.append(
    "objectKey",
    buildObjectKey(payload.directory, payload.filename)
  );
  formData.append("file", payload.file);

  return formRequest<AdminUploadResponse>("/api/admin/oss/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
}

export async function fetchAdminBucketObjects(
  token: string,
  params: {
    prefix: string;
    delimiter: string;
    maxKeys: number;
    continuationToken?: string;
  }
): Promise<BucketObjectsResponse> {
  const searchParams = new URLSearchParams();
  appendSearchParam(searchParams, "prefix", params.prefix);
  appendSearchParam(searchParams, "delimiter", params.delimiter);
  appendSearchParam(searchParams, "maxKeys", String(params.maxKeys));
  appendSearchParam(
    searchParams,
    "continuationToken",
    params.continuationToken
  );

  return request<BucketObjectsResponse>(
    `/api/admin/oss/objects?${searchParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
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

async function formRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

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

function buildObjectKey(directory: string, filename: string): string {
  const normalizedDirectory = directory.trim().replaceAll("\\", "/");
  const normalizedFilename = filename.trim().replaceAll("\\", "/");
  return [normalizedDirectory, normalizedFilename]
    .flatMap((part) => part.split("/"))
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");
}

function appendSearchParam(
  searchParams: URLSearchParams,
  key: string,
  value: string | undefined
): void {
  if (value?.trim()) {
    searchParams.set(key, value.trim());
  }
}
