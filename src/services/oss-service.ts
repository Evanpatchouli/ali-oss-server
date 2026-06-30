import { randomUUID } from "node:crypto";
import path from "node:path";
import type { Readable } from "node:stream";

import client from "../core/client.js";
import { config } from "../config/env.js";
import { badRequest } from "../utils/http-error.js";

export type UploadedObject = {
  objectKey: string;
  url: string;
  bucket: string;
};

/**
 * Uploads a local file path to Aliyun OSS with a validated object key.
 */
export async function uploadLocalFile(input: {
  clientId: string;
  objectKey?: string;
  randomFilename?: boolean;
  localFilePath: string;
  originalFilename?: string | null;
  mimeType?: string | null;
}): Promise<UploadedObject> {
  const objectKey = buildClientUploadObjectKey({
    clientId: input.clientId,
    objectKey: input.objectKey ?? getOriginalFilename(input.originalFilename),
    randomFilename: input.randomFilename ?? false,
  });
  const result = await client.put(objectKey, path.normalize(input.localFilePath), {
    mime: input.mimeType ?? undefined,
  });

  return buildUploadedObject(result.name);
}

/**
 * Uploads a request stream to Aliyun OSS with a validated object key.
 */
export async function uploadStream(input: {
  clientId: string;
  objectKey?: string;
  randomFilename?: boolean;
  stream: Readable;
  fileName?: string;
  mimeType?: string;
  contentLength?: number;
}): Promise<UploadedObject> {
  const objectKey = buildClientUploadObjectKey({
    clientId: input.clientId,
    objectKey: input.objectKey ?? getOriginalFilename(input.fileName),
    randomFilename: input.randomFilename ?? false,
  });
  const options = {} as NonNullable<Parameters<typeof client.putStream>[2]>;

  if (input.contentLength !== undefined) {
    options.contentLength = input.contentLength;
  }

  if (input.mimeType) {
    options.mime = input.mimeType;
  }

  const result = await client.putStream(objectKey, input.stream, options);

  return buildUploadedObject(result.name);
}

/**
 * Deletes a single object from Aliyun OSS.
 */
export async function deleteObject(input: {
  clientId: string;
  objectKey: string;
}): Promise<{ objectKey: string; deleted: true }> {
  const normalizedObjectKey = resolveClientObjectKey(input.clientId, input.objectKey);
  await client.delete(normalizedObjectKey);

  return {
    objectKey: normalizedObjectKey,
    deleted: true,
  };
}

function buildClientUploadObjectKey(input: {
  clientId: string;
  objectKey: string;
  randomFilename: boolean;
}): string {
  const clientDirectory = normalizeClientDirectory(input.clientId);
  const segments = normalizeRelativeObjectKey(clientDirectory, input.objectKey);
  const uploadSegments = input.randomFilename ? rewriteLastFilename(segments) : segments;
  return validateObjectKeyLength([clientDirectory, ...uploadSegments].join("/"));
}

function resolveClientObjectKey(clientId: string, objectKey: string): string {
  const clientDirectory = normalizeClientDirectory(clientId);
  return validateObjectKeyLength([clientDirectory, ...normalizeRelativeObjectKey(clientDirectory, objectKey)].join("/"));
}

function normalizeClientDirectory(clientId: string): string {
  const clientDirectory = normalizeObjectKeySegment(clientId);
  if (clientDirectory.includes("/") || clientDirectory.includes("\\")) {
    throw badRequest("INVALID_CLIENT_ID", "clientId must be a directory name");
  }

  return clientDirectory;
}

function normalizeRelativeObjectKey(clientDirectory: string, objectKey: string): string[] {
  const normalized = objectKey.trim().replaceAll("\\", "/").replace(/^\/+/, "");
  const segments = normalized.split("/").filter(Boolean).map(normalizeObjectKeySegment);
  const relativeSegments = segments[0] === clientDirectory ? segments.slice(1) : segments;

  if (relativeSegments.length === 0) {
    throw badRequest("INVALID_OBJECT_KEY", "objectKey is required");
  }

  return relativeSegments;
}

function normalizeObjectKeySegment(segment: string): string {
  const normalized = segment.trim();

  if (!normalized) {
    throw badRequest("INVALID_OBJECT_KEY", "objectKey contains an empty path segment");
  }

  if (normalized === "." || normalized === "..") {
    throw badRequest("INVALID_OBJECT_KEY", "objectKey must not be a relative path segment");
  }

  if (/[\x00-\x1F\x7F]/u.test(normalized)) {
    throw badRequest("INVALID_OBJECT_KEY", "objectKey contains invalid control characters");
  }

  return normalized;
}

function rewriteLastFilename(segments: string[]): string[] {
  const rewrittenSegments = [...segments];
  const currentFilename = rewrittenSegments[rewrittenSegments.length - 1];
  rewrittenSegments[rewrittenSegments.length - 1] = buildRandomFilename(currentFilename);
  return rewrittenSegments;
}

function buildRandomFilename(filename: string): string {
  const extension = path.posix.extname(filename);
  return `${randomUUID()}${extension === "." ? "" : extension}`;
}

function getOriginalFilename(originalFilename?: string | null): string {
  const normalized = originalFilename?.trim().replaceAll("\\", "/") ?? "";
  const filename = normalized.split("/").filter(Boolean).at(-1);
  return filename || "file";
}

function buildUploadedObject(objectKey: string): UploadedObject {
  return {
    objectKey,
    url: client.generateObjectUrl(objectKey),
    bucket: config.oss.bucket,
  };
}

function validateObjectKeyLength(objectKey: string): string {
  if (Buffer.byteLength(objectKey, "utf8") > 1023) {
    throw badRequest("INVALID_OBJECT_KEY", "objectKey must be no more than 1023 bytes");
  }

  return objectKey;
}
