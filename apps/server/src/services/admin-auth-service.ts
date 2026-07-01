import { timingSafeEqual } from "node:crypto";

import { config } from "../config/env.js";
import { unauthorized } from "../utils/http-error.js";

/**
 * Authenticates the configured admin user.
 */
export function authenticateAdminUser(
  username: string,
  password: string
): { username: string } {
  const expectedUsername = config.admin.username;
  const expectedPassword = config.admin.password;

  if (
    !safeEqual(username, expectedUsername) ||
    !safeEqual(password, expectedPassword)
  ) {
    throw unauthorized(
      "INVALID_ADMIN_CREDENTIALS",
      "Invalid admin credentials"
    );
  }

  return { username: expectedUsername };
}

function safeEqual(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}
