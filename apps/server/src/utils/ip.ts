import { isIP } from "node:net";

import { badRequest } from "./http-error.js";

/**
 * Normalizes an IPv4 or IPv6 address for exact in-memory matching.
 */
export function normalizeIp(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    throw badRequest("INVALID_IP", "ip is required");
  }

  if (normalized.startsWith("::ffff:")) {
    const mappedIpv4 = normalized.slice(7);
    if (isIP(mappedIpv4) === 4) {
      return mappedIpv4;
    }
  }

  if (isIP(normalized) === 0) {
    throw badRequest("INVALID_IP", "ip must be a valid IPv4 or IPv6 address");
  }

  return normalized;
}

export function normalizeOptionalIp(value: string): string | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  try {
    return normalizeIp(normalized);
  } catch {
    return undefined;
  }
}
