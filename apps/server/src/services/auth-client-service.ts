import type { AuthClient } from "../config/env.js";
import { badRequest } from "../utils/http-error.js";

let authClientMap = new Map<string, AuthClient>();

export function getAuthClient(clientId: string): AuthClient | undefined {
  const normalizedClientId = clientId.trim();
  const client = authClientMap.get(normalizedClientId);
  return client ? { ...client } : undefined;
}

export function getAuthClients(): AuthClient[] {
  return [...authClientMap.values()].map((client) => ({ ...client }));
}

export function replaceAuthClients(clients: AuthClient[]): AuthClient[] {
  authClientMap = buildAuthClientMap(clients);
  return getAuthClients();
}

function buildAuthClientMap(clients: AuthClient[]): Map<string, AuthClient> {
  const nextClientMap = new Map<string, AuthClient>();
  clients.forEach((client, index) => {
    const normalizedClient = normalizeAuthClient(client, index);
    if (nextClientMap.has(normalizedClient.clientId)) {
      throw badRequest(
        "INVALID_AUTH_CLIENTS",
        `Duplicate clientId: ${normalizedClient.clientId}`
      );
    }

    nextClientMap.set(normalizedClient.clientId, normalizedClient);
  });

  return nextClientMap;
}

function normalizeAuthClient(client: AuthClient, index: number): AuthClient {
  return {
    clientId: normalizeClientId(client.clientId, `authClients[${index}]`),
    clientSecret: normalizeClientSecret(
      client.clientSecret,
      `authClients[${index}]`
    ),
  };
}

function normalizeClientId(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw badRequest(
      "INVALID_AUTH_CLIENTS",
      `${label}.clientId must not be empty`
    );
  }

  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.includes("/") ||
    normalized.includes("\\")
  ) {
    throw badRequest(
      "INVALID_AUTH_CLIENTS",
      `${label}.clientId must be a directory name`
    );
  }

  if (/[\x00-\x1F\x7F]/u.test(normalized)) {
    throw badRequest(
      "INVALID_AUTH_CLIENTS",
      `${label}.clientId contains invalid control characters`
    );
  }

  return normalized;
}

function normalizeClientSecret(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw badRequest(
      "INVALID_AUTH_CLIENTS",
      `${label}.clientSecret must not be empty`
    );
  }

  if (/[\x00-\x1F\x7F]/u.test(normalized)) {
    throw badRequest(
      "INVALID_AUTH_CLIENTS",
      `${label}.clientSecret contains invalid control characters`
    );
  }

  return normalized;
}
