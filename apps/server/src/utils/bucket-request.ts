import { config } from "../config/env.js";
import { badRequest } from "./http-error.js";

export function resolveRequestBucket(input: {
  headers: Record<string, string | string[] | undefined>;
  rawHeaders?: string[];
  body?: unknown;
}): string {
  const rawHeaderCount = input.rawHeaders
    ? input.rawHeaders.filter(
        (value, index) =>
          index % 2 === 0 && value.toLowerCase() === "x-oss-bucket"
      ).length
    : 0;
  if (rawHeaderCount > 1) {
    throw badRequest(
      "INVALID_BUCKET",
      "x-oss-bucket must be provided only once"
    );
  }
  const header = input.headers["x-oss-bucket"];
  if (Array.isArray(header)) {
    throw badRequest(
      "INVALID_BUCKET",
      "x-oss-bucket must be provided only once"
    );
  }
  const headerBucket =
    header === undefined ? undefined : normalizeBucket(header, "x-oss-bucket");

  let bodyBucket: string | undefined;
  if (
    input.body &&
    typeof input.body === "object" &&
    !Array.isArray(input.body) &&
    Object.hasOwn(input.body, "bucket")
  ) {
    const value = (input.body as Record<string, unknown>).bucket;
    if (typeof value !== "string") {
      throw badRequest("INVALID_BUCKET", "bucket must be a non-empty string");
    }
    bodyBucket = normalizeBucket(value, "bucket");
  }

  if (headerBucket && bodyBucket && headerBucket !== bodyBucket) {
    throw badRequest("BUCKET_CONFLICT", "bucket header and body must match");
  }
  const bucket = headerBucket ?? bodyBucket ?? config.oss.buckets[0].name;
  if (!config.oss.buckets.some((item) => item.name === bucket)) {
    throw badRequest("BUCKET_NOT_CONFIGURED", "bucket is not configured");
  }
  return bucket;
}

function normalizeBucket(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized)
    throw badRequest("INVALID_BUCKET", `${field} must not be empty`);
  return normalized;
}
