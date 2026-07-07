import { AliOssServerSdkError } from "./errors.js";

export function normalizeRequiredUrl(value: string, fieldName: string): string {
  const normalized = normalizeRequiredString(value, fieldName).replace(
    /\/+$/u,
    ""
  );

  try {
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Invalid protocol");
    }
  } catch {
    throw new AliOssServerSdkError(
      `${fieldName} must be an absolute http(s) URL`
    );
  }

  return normalized;
}

export function normalizeRequiredString(
  value: string,
  fieldName: string
): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new AliOssServerSdkError(`${fieldName} is required`);
  }

  return normalized;
}

export function normalizePrefix(value: string): string {
  return value
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\/+|\/+$/gu, "");
}
