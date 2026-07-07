import { randomUUID } from "node:crypto";
import { normalizePrefix } from "./normalize.js";

export function buildObjectKey(
  originalName: string,
  objectPrefix: string
): string {
  const now = new Date();
  const dayPath = now.toISOString().slice(0, 10).replaceAll("-", "/");
  const prefix = normalizePrefix(objectPrefix);
  const filename = sanitizeFilename(originalName);
  return [prefix, dayPath, `${Date.now()}-${randomUUID()}-${filename}`]
    .filter(Boolean)
    .join("/");
}

function sanitizeFilename(originalName: string): string {
  const filename = originalName.trim() || "file";
  const sanitized = filename
    .replace(/[\\/:*?"<>|]+/gu, "-")
    .replace(/[\x00-\x1F\x7F]+/gu, "")
    .trim();
  return (sanitized || "file").slice(0, 180);
}
