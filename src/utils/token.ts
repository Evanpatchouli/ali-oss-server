import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { config } from "../config/env.js";
import { unauthorized } from "./http-error.js";

type AccessTokenPayload = {
  iss: "ali-oss-server";
  sub: string;
  iat: number;
  exp: number;
  jti: string;
};

export type VerifiedAccessToken = {
  clientId: string;
  expiresAt: string;
  tokenId: string;
};

const TOKEN_ISSUER = "ali-oss-server";
const TOKEN_HEADER = {
  alg: "HS256",
  typ: "JWT",
};

/**
 * Signs a short-lived bearer token for a configured API caller.
 */
export function signAccessToken(clientId: string): {
  token: string;
  expiresIn: number;
  expiresAt: string;
} {
  const issuedAt = currentUnixSeconds();
  const expiresAt = issuedAt + config.auth.tokenExpiresInSeconds;
  const payload: AccessTokenPayload = {
    iss: TOKEN_ISSUER,
    sub: clientId,
    iat: issuedAt,
    exp: expiresAt,
    jti: randomUUID(),
  };

  const encodedHeader = base64UrlJson(TOKEN_HEADER);
  const encodedPayload = base64UrlJson(payload);
  const signature = sign(`${encodedHeader}.${encodedPayload}`);

  return {
    token: `${encodedHeader}.${encodedPayload}.${signature}`,
    expiresIn: config.auth.tokenExpiresInSeconds,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
}

/**
 * Verifies a bearer token and returns the caller identity embedded in it.
 */
export function verifyAccessToken(token: string): VerifiedAccessToken {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw unauthorized("TOKEN_INVALID", "Invalid token");
  }

  const [encodedHeader, encodedPayload, receivedSignature] = parts;
  const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`);
  if (!safeEqual(receivedSignature, expectedSignature)) {
    throw unauthorized("TOKEN_INVALID", "Invalid token");
  }

  const payload = parseTokenPayload(encodedPayload);
  if (payload.iss !== TOKEN_ISSUER || !payload.sub || !payload.jti) {
    throw unauthorized("TOKEN_INVALID", "Invalid token");
  }

  if (payload.exp <= currentUnixSeconds()) {
    throw unauthorized("TOKEN_EXPIRED", "Token expired");
  }

  return {
    clientId: payload.sub,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    tokenId: payload.jti,
  };
}

function sign(value: string): string {
  return createHmac("sha256", config.auth.tokenSecret).update(value).digest("base64url");
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function parseTokenPayload(encodedPayload: string): AccessTokenPayload {
  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as unknown;
    if (!isTokenPayload(parsed)) {
      throw new Error("Invalid token payload");
    }

    return parsed;
  } catch {
    throw unauthorized("TOKEN_INVALID", "Invalid token");
  }
}

function isTokenPayload(value: unknown): value is AccessTokenPayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const payload = value as Partial<AccessTokenPayload>;
  return (
    payload.iss === TOKEN_ISSUER &&
    typeof payload.sub === "string" &&
    typeof payload.iat === "number" &&
    typeof payload.exp === "number" &&
    typeof payload.jti === "string"
  );
}

function safeEqual(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

function currentUnixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
