import { createHmac, timingSafeEqual } from "node:crypto";

import { config, type AuthClient } from "../config/env.js";
import { unauthorized } from "../utils/http-error.js";

/**
 * Validates a configured caller signature.
 */
export function authenticateClient(clientId: string, receivedSign: string): AuthClient {
  const client = config.auth.clients.find((item) => item.clientId === clientId);
  if (!client) {
    throw unauthorized("INVALID_CLIENT_CREDENTIALS", "Invalid client credentials");
  }

  const expectedSign = signClientId(client.clientId, client.clientSecret);
  if (!safeStringEqual(receivedSign, expectedSign)) {
    throw unauthorized("INVALID_CLIENT_CREDENTIALS", "Invalid client credentials");
  }

  return client;
}

function signClientId(clientId: string, clientSecret: string): string {
  return createHmac("sha256", clientSecret).update(clientId).digest("base64url");
}

function safeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
