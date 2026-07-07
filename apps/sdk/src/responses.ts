import { AliOssServerSdkError } from "./errors.js";
import type { AliOssUploadResult } from "./types.js";

export function readUploadResult(
  body: Partial<AliOssUploadResult>
): AliOssUploadResult {
  if (!body.objectKey || !body.url || !body.bucket) {
    throw new AliOssServerSdkError("OSS upload response is invalid", {
      responseBody: body,
    });
  }

  return {
    objectKey: body.objectKey,
    url: body.url,
    bucket: body.bucket,
    clientId: body.clientId,
  };
}

export function readResponseMessage(body: unknown, fallback: string): string {
  if (isRecord(body)) {
    if (typeof body.message === "string") {
      return body.message;
    }

    if (isRecord(body.error) && typeof body.error.message === "string") {
      return body.error.message;
    }
  }

  return fallback || "OSS server request failed";
}

export function readResponseCode(body: unknown): string | undefined {
  if (
    isRecord(body) &&
    isRecord(body.error) &&
    typeof body.error.code === "string"
  ) {
    return body.error.code;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
