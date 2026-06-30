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
    clients: AuthClient[];
    tokenSecret: string;
    tokenExpiresInSeconds: number;
  };
  admin: {
    username: string;
    password: string;
  };
  oss: {
    region: string;
    bucket: string;
    accessKeyId: string;
    accessKeySecret: string;
    secure: boolean;
    maxFileSizeBytes: number;
  };
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw badRequest("ENV_MISSING", `Missing required environment variable: ${name}`);
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

function parseAuthClients(rawValue: string): AuthClient[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  } catch {
    throw badRequest("ENV_INVALID", "AUTH_CLIENTS must be a valid JSON array");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw badRequest("ENV_INVALID", "AUTH_CLIENTS must contain at least one client");
  }

  const seenClientIds = new Set<string>();
  return parsed.map((item, index) => {
    if (!isRecord(item)) {
      throw badRequest("ENV_INVALID", `AUTH_CLIENTS[${index}] must be an object`);
    }

    const clientId = readString(item.clientId);
    const clientSecret = readString(item.clientSecret);
    if (!clientId || !clientSecret) {
      throw badRequest(
        "ENV_INVALID",
        `AUTH_CLIENTS[${index}] must include non-empty clientId and clientSecret`,
      );
    }

    if (seenClientIds.has(clientId)) {
      throw badRequest("ENV_INVALID", `Duplicate clientId in AUTH_CLIENTS: ${clientId}`);
    }

    seenClientIds.add(clientId);
    return { clientId, clientSecret };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

const tokenSecret = requiredEnv("TOKEN_SECRET");
if (tokenSecret.length < 16) {
  throw badRequest("ENV_INVALID", "TOKEN_SECRET must be at least 16 characters");
}

export const config: AppConfig = {
  port: parsePositiveInt("PORT", 9512),
  auth: {
    clients: parseAuthClients(requiredEnv("AUTH_CLIENTS")),
    tokenSecret,
    tokenExpiresInSeconds: parsePositiveInt("TOKEN_EXPIRES_IN_SECONDS", 7200),
  },
  admin: {
    username: requiredEnv("ADMIN_USERNAME"),
    password: requiredEnv("ADMIN_PASSWORD"),
  },
  oss: {
    region: requiredEnv("OSS_REGION"),
    bucket: requiredEnv("OSS_BUCKET_NAME"),
    accessKeyId: requiredEnv("OSS_ACCESS_KEY_ID"),
    accessKeySecret: requiredEnv("OSS_ACCESS_KEY_SECRET"),
    secure: parseBoolean("OSS_SECURE", true),
    maxFileSizeBytes: parsePositiveInt("UPLOAD_MAX_FILE_SIZE_MB", 20) * 1024 * 1024,
  },
};
