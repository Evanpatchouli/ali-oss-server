import { timingSafeEqual } from "node:crypto";

import { config, type AuthClient } from "../config/env.js";
import { unauthorized } from "../utils/http-error.js";

/**
 * Validates a configured caller credential pair.
 */
export function authenticateClient(clientId: string, clientSecret: string): AuthClient {
  const client = config.auth.clients.find((item) => item.clientId === clientId);
  if (!client || !safeStringEqual(client.clientSecret, clientSecret)) {
    throw unauthorized("INVALID_CLIENT_CREDENTIALS", "Invalid clientId or clientSecret");
  }

  return client;
}

function safeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
