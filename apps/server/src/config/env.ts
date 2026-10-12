import dotenv from "dotenv";

import { badRequest } from "../utils/http-error.js";
import { workspaceEnvFilePath } from "../utils/paths.js";

dotenv.config({ path: workspaceEnvFilePath });

export type AuthClient = {
  clientId: string;
  clientSecret: string;
};

type AppConfig = {
  port: number;
  auth: {
    tokenSecret: string;
    tokenExpiresInSeconds: number;
  };
  admin: {
    username: string;
    password: string;
  };
  oss: {
    buckets: Array<{ name: string; region: string }>;
    accessKeyId: string;
    accessKeySecret: string;
    secure: boolean;
    maxFileSizeBytes: number;
  };
};

export type OssBucket = { name: string; region: string };

export function parseOssBuckets(
  env: Record<string, string | undefined>
): OssBucket[] {
  if (env.OSS_BUCKETS !== undefined) {
    const configured = env.OSS_BUCKETS.trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(configured);
    } catch {
      throw badRequest("ENV_INVALID", "OSS_BUCKETS must be a valid JSON array");
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw badRequest("ENV_INVALID", "OSS_BUCKETS must be a non-empty array");
    }
    const names = new Set<string>();
    return parsed.map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw badRequest(
          "ENV_INVALID",
          `OSS_BUCKETS[${index}] must be an object`
        );
      }
      const { name, region } = item as Record<string, unknown>;
      if (typeof name !== "string" || typeof region !== "string") {
        throw badRequest(
          "ENV_INVALID",
          `OSS_BUCKETS[${index}] must include non-empty name and region`
        );
      }
      const normalizedRegion = region.trim();
      const bucket = { name: name.trim(), region: normalizedRegion };
      if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/u.test(bucket.name)) {
        throw badRequest(
          "ENV_INVALID",
          `OSS_BUCKETS[${index}].name must be a valid OSS bucket name`
        );
      }
      if (
        !bucket.region ||
        /[\x00-\x1F\x7F]/u.test(region) ||
        /[\x00-\x20\x7F]/u.test(bucket.region)
      ) {
        throw badRequest(
          "ENV_INVALID",
          `OSS_BUCKETS[${index}].region must be a non-empty region name`
        );
      }
      if (names.has(bucket.name)) {
        throw badRequest(
          "ENV_INVALID",
          `OSS_BUCKETS contains duplicate bucket name: ${bucket.name}`
        );
      }
      names.add(bucket.name);
      return bucket;
    });
  }
  return [
    {
      name: requiredEnvFrom(env, "OSS_BUCKET_NAME"),
      region: requiredEnvFrom(env, "OSS_REGION"),
    },
  ];
}

function requiredEnvFrom(
  env: Record<string, string | undefined>,
  name: string
): string {
  const value = env[name]?.trim();
  if (!value)
    throw badRequest(
      "ENV_MISSING",
      `Missing required environment variable: ${name}`
    );
  return value;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw badRequest(
      "ENV_MISSING",
      `Missing required environment variable: ${name}`
    );
  }
  return value;
}

function parsePositiveInt(name: string, fallback: number): number {
  const rawValue = process.env[name]?.trim();
  if (!rawValue) {
    return fallback;
  }

  const value = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(value) || value <= 0) {
    throw badRequest("ENV_INVALID", `${name} must be a positive integer`);
  }

  return value;
}

function parseBoolean(name: string, fallback: boolean): boolean {
  const rawValue = process.env[name]?.trim().toLowerCase();
  if (!rawValue) {
    return fallback;
  }

  if (rawValue === "true") {
    return true;
  }

  if (rawValue === "false") {
    return false;
  }

  throw badRequest("ENV_INVALID", `${name} must be true or false`);
}

const tokenSecret = requiredEnv("TOKEN_SECRET");
if (tokenSecret.length < 16) {
  throw badRequest(
    "ENV_INVALID",
    "TOKEN_SECRET must be at least 16 characters"
  );
}

export const config: AppConfig = {
  port: parsePositiveInt("PORT", 9512),
  auth: {
    tokenSecret,
    tokenExpiresInSeconds: parsePositiveInt("TOKEN_EXPIRES_IN_SECONDS", 7200),
  },
  admin: {
    username: requiredEnv("ADMIN_USERNAME"),
    password: requiredEnv("ADMIN_PASSWORD"),
  },
  oss: {
    buckets: parseOssBuckets(process.env),
    accessKeyId: requiredEnv("OSS_ACCESS_KEY_ID"),
    accessKeySecret: requiredEnv("OSS_ACCESS_KEY_SECRET"),
    secure: parseBoolean("OSS_SECURE", true),
    maxFileSizeBytes:
      parsePositiveInt("UPLOAD_MAX_FILE_SIZE_MB", 20) * 1024 * 1024,
  },
};
