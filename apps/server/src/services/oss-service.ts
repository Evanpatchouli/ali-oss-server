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

export type BucketObjectSummary = {
  objectKey: string;
  url: string;
  size: number | null;
  lastModified: string | null;
  etag: string | null;
  storageClass: string | null;
};

export type BucketObjectsPage = {
  bucket: string;
  prefix: string;
  delimiter: string;
  maxKeys: number;
  keyCount: number | null;
  isTruncated: boolean;
  nextContinuationToken: string | null;
  objects: BucketObjectSummary[];
  prefixes: string[];
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
  const result = await client.put(
    objectKey,
    path.normalize(input.localFilePath),
    {
      mime: input.mimeType ?? undefined,
    }
  );

  return buildUploadedObject(result.name);
}

/**
 * Uploads a local file path to Aliyun OSS for admin-only operations.
 */
export async function uploadAdminLocalFile(input: {
  objectKey?: string;
  localFilePath: string;
  originalFilename?: string | null;
  mimeType?: string | null;
}): Promise<UploadedObject> {
  const objectKey = buildAdminUploadObjectKey(
    input.objectKey ?? getOriginalFilename(input.originalFilename)
  );
  const result = await client.put(
    objectKey,
    path.normalize(input.localFilePath),
    {
      mime: input.mimeType ?? undefined,
    }
  );

  return buildUploadedObject(result.name);
}

/**
 * Lists objects in the configured OSS bucket for admin-only operations.
 */
export async function listAdminBucketObjects(input: {
  prefix?: string;
  delimiter?: string;
  continuationToken?: string;
  maxKeys?: number;
}): Promise<BucketObjectsPage> {
  const prefix = normalizeOptionalListPath(input.prefix, "prefix");
  const delimiter = normalizeOptionalDelimiter(input.delimiter);
  const continuationToken = normalizeOptionalToken(input.continuationToken);
  const maxKeys = input.maxKeys ?? 100;
  const listQuery = {
    "max-keys": maxKeys,
    ...(prefix ? { prefix } : {}),
    ...(delimiter ? { delimiter } : {}),
    ...(continuationToken ? { "continuation-token": continuationToken } : {}),
  };
  const result = (await client.listV2(listQuery)) as unknown as Record<
    string,
    unknown
  >;

  return {
    bucket: config.oss.bucket,
    prefix,
    delimiter,
    maxKeys,
    keyCount: readNullableNumber(result.keyCount),
    isTruncated: readBoolean(result.isTruncated),
    nextContinuationToken:
      readNullableString(result.nextContinuationToken) ??
      readNullableString(result.NextContinuationToken),
    objects: readObjects(result.objects),
    prefixes: readPrefixes(result.prefixes),
  };
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
  const normalizedObjectKey = resolveClientObjectKey(
    input.clientId,
    input.objectKey
  );
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
  const uploadSegments = input.randomFilename
    ? rewriteLastFilename(segments)
    : segments;
  return validateObjectKeyLength(
    [clientDirectory, ...uploadSegments].join("/")
  );
}

function resolveClientObjectKey(clientId: string, objectKey: string): string {
  const clientDirectory = normalizeClientDirectory(clientId);
  return validateObjectKeyLength(
    [
      clientDirectory,
      ...normalizeRelativeObjectKey(clientDirectory, objectKey),
    ].join("/")
  );
}

function buildAdminUploadObjectKey(objectKey: string): string {
  return validateObjectKeyLength(normalizeObjectKey(objectKey).join("/"));
}

function normalizeOptionalListPath(
  value: string | undefined,
  fieldName: string
): string {
  const normalized = value?.trim().replaceAll("\\", "/") ?? "";
  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("/")) {
    throw badRequest("INVALID_FIELD", `${fieldName} must not start with /`);
  }

  if (/[\x00-\x1F\x7F]/u.test(normalized)) {
    throw badRequest(
      "INVALID_FIELD",
      `${fieldName} contains invalid control characters`
    );
  }

  if (Buffer.byteLength(normalized, "utf8") > 1023) {
    throw badRequest(
      "INVALID_FIELD",
      `${fieldName} must be no more than 1023 bytes`
    );
  }

  return normalized;
}

function normalizeOptionalDelimiter(value: string | undefined): string {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    return "";
  }

  if (/[\x00-\x1F\x7F]/u.test(normalized)) {
    throw badRequest(
      "INVALID_FIELD",
      "delimiter contains invalid control characters"
    );
  }

  return normalized;
}

function normalizeOptionalToken(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }

  if (/[\x00-\x1F\x7F]/u.test(normalized)) {
    throw badRequest(
      "INVALID_FIELD",
      "continuationToken contains invalid control characters"
    );
  }

  return normalized;
}

function normalizeClientDirectory(clientId: string): string {
  const clientDirectory = normalizeObjectKeySegment(clientId);
  if (clientDirectory.includes("/") || clientDirectory.includes("\\")) {
    throw badRequest("INVALID_CLIENT_ID", "clientId must be a directory name");
  }

  return clientDirectory;
}

function normalizeRelativeObjectKey(
  clientDirectory: string,
  objectKey: string
): string[] {
  const segments = normalizeObjectKey(objectKey);
  const relativeSegments =
    segments[0] === clientDirectory ? segments.slice(1) : segments;

  if (relativeSegments.length === 0) {
    throw badRequest("INVALID_OBJECT_KEY", "objectKey is required");
  }

  return relativeSegments;
}

function normalizeObjectKey(objectKey: string): string[] {
  const normalized = objectKey.trim().replaceAll("\\", "/").replace(/^\/+/, "");
  const segments = normalized
    .split("/")
    .filter(Boolean)
    .map(normalizeObjectKeySegment);

  if (segments.length === 0) {
    throw badRequest("INVALID_OBJECT_KEY", "objectKey is required");
  }

  return segments;
}

function normalizeObjectKeySegment(segment: string): string {
  const normalized = segment.trim();

  if (!normalized) {
    throw badRequest(
      "INVALID_OBJECT_KEY",
      "objectKey contains an empty path segment"
    );
  }

  if (normalized === "." || normalized === "..") {
    throw badRequest(
      "INVALID_OBJECT_KEY",
      "objectKey must not be a relative path segment"
    );
  }

  if (/[\x00-\x1F\x7F]/u.test(normalized)) {
    throw badRequest(
      "INVALID_OBJECT_KEY",
      "objectKey contains invalid control characters"
    );
  }

  return normalized;
}

function rewriteLastFilename(segments: string[]): string[] {
  const rewrittenSegments = [...segments];
  const currentFilename = rewrittenSegments[rewrittenSegments.length - 1];
  rewrittenSegments[rewrittenSegments.length - 1] =
    buildRandomFilename(currentFilename);
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
    throw badRequest(
      "INVALID_OBJECT_KEY",
      "objectKey must be no more than 1023 bytes"
    );
  }

  return objectKey;
}

function readObjects(value: unknown): BucketObjectSummary[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item) => {
      const objectKey = readNullableString(item.name) ?? "";
      return {
        objectKey,
        url: objectKey ? client.generateObjectUrl(objectKey) : "",
        size: readNullableNumber(item.size),
        lastModified: readNullableDateString(item.lastModified),
        etag: readNullableString(item.etag),
        storageClass:
          readNullableString(item.storageClass) ??
          readNullableString(item.storageClassType),
      };
    })
    .filter((item) => item.objectKey);
}

function readPrefixes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (isRecord(item)) {
        return readNullableString(item.prefix);
      }

      return null;
    })
    .filter((item): item is string => Boolean(item));
}

function readNullableDateString(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return readNullableString(value);
}

function readBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

function readNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
