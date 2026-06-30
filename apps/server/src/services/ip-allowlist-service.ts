import { normalizeIp } from "../utils/ip.js";

let allowlist = new Set<string>();

export function getAllowedIps(): string[] {
  return [...allowlist].sort((left, right) => left.localeCompare(right));
}

export function replaceAllowedIps(ips: string[]): string[] {
  allowlist = new Set(ips.map(normalizeIp));
  return getAllowedIps();
}

export function isIpAllowed(ip: string): boolean {
  if (allowlist.size === 0) {
    return true;
  }

  return allowlist.has(normalizeIp(ip));
}

export function isIpAllowlistEnabled(): boolean {
  return allowlist.size > 0;
}
