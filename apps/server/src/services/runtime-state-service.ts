import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { AuthClient } from "../config/env.js";
import {
  getAuthClients,
  replaceAuthClients,
} from "./auth-client-service.js";
import { getAllowedIps, replaceAllowedIps } from "./ip-allowlist-service.js";
import {
  getRateLimitSettings,
  replaceRateLimitSettings,
  type RateLimitRule,
  type RouteRateLimitRule,
} from "./rate-limit-service.js";
import { runtimeStateDirectory, runtimeStateFilePath } from "../utils/paths.js";

type PersistedRuntimeState = {
  authClients: AuthClient[];
  ipAllowlist: string[];
  rateLimit: {
    globalRule: RateLimitRule | null;
    routeRules: RouteRateLimitRule[];
  };
};

/**
 * Loads persisted runtime state from disk. Missing or invalid files fall back to defaults.
 */
export async function initializeRuntimeState(): Promise<void> {
  const persistedState = await readPersistedState();
  if (!persistedState) {
    return;
  }

  try {
    replaceAuthClients(persistedState.authClients);
    replaceAllowedIps(persistedState.ipAllowlist);
    replaceRateLimitSettings(persistedState.rateLimit);
  } catch (error) {
    console.error(
      "Failed to apply persisted runtime state, falling back to defaults.",
      error
    );
    replaceAuthClients([]);
    replaceAllowedIps([]);
    replaceRateLimitSettings({
      globalRule: null,
      routeRules: [],
    });
  }
}

export async function updatePersistedAuthClients(
  clients: AuthClient[]
): Promise<AuthClient[]> {
  const previousState = getRuntimeStateSnapshot();
  const nextClients = replaceAuthClients(clients);

  try {
    await persistRuntimeState();
    return nextClients;
  } catch (error) {
    restoreRuntimeState(previousState);
    throw error;
  }
}

export async function updatePersistedIpAllowlist(
  ips: string[]
): Promise<string[]> {
  const previousState = getRuntimeStateSnapshot();
  const nextIps = replaceAllowedIps(ips);

  try {
    await persistRuntimeState();
    return nextIps;
  } catch (error) {
    restoreRuntimeState(previousState);
    throw error;
  }
}

export async function updatePersistedRateLimitSettings(input: {
  globalRule: RateLimitRule | null;
  routeRules: RouteRateLimitRule[];
}): Promise<ReturnType<typeof getRateLimitSettings>> {
  const previousState = getRuntimeStateSnapshot();
  const nextSettings = replaceRateLimitSettings(input);

  try {
    await persistRuntimeState();
    return nextSettings;
  } catch (error) {
    restoreRuntimeState(previousState);
    throw error;
  }
}

function restoreRuntimeState(state: PersistedRuntimeState): void {
  replaceAuthClients(state.authClients);
  replaceAllowedIps(state.ipAllowlist);
  replaceRateLimitSettings(state.rateLimit);
}

function getRuntimeStateSnapshot(): PersistedRuntimeState {
  const rateLimitSettings = getRateLimitSettings();

  return {
    authClients: getAuthClients(),
    ipAllowlist: getAllowedIps(),
    rateLimit: {
      globalRule: rateLimitSettings.globalRule,
      routeRules: rateLimitSettings.routeRules,
    },
  };
}

async function persistRuntimeState(): Promise<void> {
  const state = getRuntimeStateSnapshot();
  const serialized = `${JSON.stringify(state, null, 2)}\n`;
  const temporaryFilePath = path.join(
    runtimeStateDirectory,
    "runtime-state.tmp"
  );

  await mkdir(runtimeStateDirectory, { recursive: true });
  await writeFile(temporaryFilePath, serialized, "utf8");
  await rename(temporaryFilePath, runtimeStateFilePath);
}

async function readPersistedState(): Promise<PersistedRuntimeState | null> {
  try {
    const rawValue = await readFile(runtimeStateFilePath, "utf8");
    const parsed = JSON.parse(rawValue) as unknown;
    return normalizePersistedRuntimeState(parsed);
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }

    console.error(
      "Failed to read persisted runtime state, falling back to defaults.",
      error
    );
    return null;
  }
}

function normalizePersistedRuntimeState(value: unknown): PersistedRuntimeState {
  if (!isRecord(value)) {
    throw new Error("Persisted runtime state must be an object");
  }

  const authClients =
    value.authClients === undefined
      ? []
      : readAuthClients(value.authClients);
  const ipAllowlist = readIpAllowlist(value.ipAllowlist);
  const rateLimit = readRateLimit(value.rateLimit);

  return {
    authClients,
    ipAllowlist,
    rateLimit,
  };
}

function readAuthClients(value: unknown): AuthClient[] {
  if (!Array.isArray(value)) {
    throw new Error("Persisted authClients must be an array");
  }

  return value.map((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.clientId !== "string" ||
      typeof item.clientSecret !== "string"
    ) {
      throw new Error(`Persisted authClients[${index}] is invalid`);
    }

    return {
      clientId: item.clientId,
      clientSecret: item.clientSecret,
    };
  });
}

function readIpAllowlist(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error("Persisted ipAllowlist must be an array");
  }

  return value.map((item, index) => {
    if (typeof item !== "string") {
      throw new Error(`Persisted ipAllowlist[${index}] must be a string`);
    }

    return item;
  });
}

function readRateLimit(value: unknown): PersistedRuntimeState["rateLimit"] {
  if (!isRecord(value)) {
    throw new Error("Persisted rateLimit must be an object");
  }

  return {
    globalRule: readOptionalGlobalRule(value.globalRule),
    routeRules: readRouteRules(value.routeRules),
  };
}

function readOptionalGlobalRule(value: unknown): RateLimitRule | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (
    !isRecord(value) ||
    typeof value.windowMs !== "number" ||
    typeof value.maxRequests !== "number"
  ) {
    throw new Error("Persisted globalRule is invalid");
  }

  return {
    windowMs: value.windowMs,
    maxRequests: value.maxRequests,
  };
}

function readRouteRules(value: unknown): RouteRateLimitRule[] {
  if (!Array.isArray(value)) {
    throw new Error("Persisted routeRules must be an array");
  }

  return value.map((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.method !== "string" ||
      typeof item.path !== "string" ||
      typeof item.windowMs !== "number" ||
      typeof item.maxRequests !== "number"
    ) {
      throw new Error(`Persisted routeRules[${index}] is invalid`);
    }

    return {
      method: item.method,
      path: item.path,
      windowMs: item.windowMs,
      maxRequests: item.maxRequests,
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}
