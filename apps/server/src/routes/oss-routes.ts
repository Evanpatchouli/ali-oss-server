import { unlink } from "node:fs/promises";
import { Transform } from "node:stream";

import Router from "@koa/router";
import type { Context } from "koa";
import type { ScalarOrArrayFiles } from "koa-body";

import { config } from "../config/env.js";
import { authenticate } from "../middleware/authenticate.js";
import {
  deleteObject,
  uploadLocalFile,
  uploadStream,
} from "../services/oss-service.js";
import {
  badRequest,
  payloadTooLarge,
  unauthorized,
} from "../utils/http-error.js";
import {
  readObjectBody,
  readOptionalBooleanHeader,
  readOptionalHeader,
  readOptionalBooleanField,
  readOptionalObjectBody,
  readOptionalStringField,
  readRequiredStringField,
} from "../utils/request.js";

type UploadedFile = {
  filepath?: string;
  originalFilename?: string | null;
  mimetype?: string | null;
  size?: number;
};

/**
 * Creates authenticated routes for OSS upload and deletion.
 */
export function createOssRouter(): Router {
  const router = new Router({ prefix: "/api/oss" });

  router.post("/upload", authenticate(), async (ctx) => {
    const file = readUploadedFile(readRequestFiles(ctx));
    const body = readOptionalObjectBody(ctx);
    const objectKey = readOptionalStringField(body, "objectKey");
    const randomFilename =
      readOptionalBooleanField(body, "randomFilename") ?? false;

    try {
      const uploaded = await uploadLocalFile({
        clientId: readAuthenticatedClientId(ctx),
        objectKey,
        randomFilename,
        localFilePath: file.filepath,
        originalFilename: file.originalFilename,
        mimeType: file.mimetype,
      });

      ctx.status = 201;
      ctx.body = {
        ...uploaded,
        clientId: ctx.state.auth?.clientId,
      };
    } finally {
      await removeTempFile(file.filepath);
    }
  });

  router.post("/upload-stream", authenticate(), async (ctx) => {
    assertSupportedStreamContentType(ctx);

    const contentLength = readOptionalContentLength(ctx);
    if (
      contentLength !== undefined &&
      contentLength > config.oss.maxFileSizeBytes
    ) {
      throw createFileTooLargeError();
    }

    const uploaded = await uploadStream({
      clientId: readAuthenticatedClientId(ctx),
      objectKey: readOptionalHeader(ctx, "x-object-key"),
      randomFilename:
        readOptionalBooleanHeader(ctx, "x-random-filename") ?? false,
      stream: ctx.req.pipe(
        createSizeLimitedStream(config.oss.maxFileSizeBytes)
      ),
      fileName: readOptionalHeader(ctx, "x-file-name"),
      mimeType: readRequestMimeType(ctx),
      contentLength,
    });

    ctx.status = 201;
    ctx.body = {
      ...uploaded,
      clientId: ctx.state.auth?.clientId,
    };
  });

  router.delete("/object", authenticate(), async (ctx) => {
    const body = readObjectBody(ctx);
    const objectKey = readRequiredStringField(body, "objectKey");
    ctx.body = {
      ...(await deleteObject({
        clientId: readAuthenticatedClientId(ctx),
        objectKey,
      })),
      clientId: ctx.state.auth?.clientId,
    };
  });

  return router;
}

function readAuthenticatedClientId(ctx: {
  state: { auth?: { clientId: string } };
}): string {
  const clientId = ctx.state.auth?.clientId;
  if (!clientId) {
    throw unauthorized("TOKEN_REQUIRED", "Bearer token is required");
  }

  return clientId;
}

function readRequestFiles(ctx: {
  request: unknown;
}): ScalarOrArrayFiles | undefined {
  return (ctx.request as { files?: ScalarOrArrayFiles }).files;
}

function readUploadedFile(
  files: unknown
): Required<Pick<UploadedFile, "filepath">> & UploadedFile {
  if (!files || typeof files !== "object" || Array.isArray(files)) {
    throw badRequest("FILE_REQUIRED", "file is required");
  }

  const fileRecord = files as Record<string, UploadedFile | UploadedFile[]>;
  const explicitFile = fileRecord.file;
  const file = Array.isArray(explicitFile)
    ? explicitFile[0]
    : (explicitFile ?? firstUploadedFile(fileRecord));

  if (!file?.filepath) {
    throw badRequest("FILE_REQUIRED", "file is required");
  }

  return { ...file, filepath: file.filepath };
}

function firstUploadedFile(
  files: Record<string, UploadedFile | UploadedFile[]>
): UploadedFile | undefined {
  for (const value of Object.values(files)) {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }

  return undefined;
}

async function removeTempFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch {
    // Formidable temporary files are best-effort cleanup.
  }
}

function assertSupportedStreamContentType(ctx: Context): void {
  const contentType = ctx.get("content-type").trim().toLowerCase();
  if (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/json") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    throw badRequest(
      "INVALID_CONTENT_TYPE",
      "upload-stream requires a raw request body such as application/octet-stream"
    );
  }
}

function readOptionalContentLength(ctx: Context): number | undefined {
  const rawValue = readOptionalHeader(ctx, "content-length");
  if (rawValue === undefined) {
    return undefined;
  }

  if (!/^\d+$/u.test(rawValue)) {
    throw badRequest(
      "INVALID_HEADER",
      "content-length header must be a non-negative integer"
    );
  }

  const value = Number.parseInt(rawValue, 10);
  if (!Number.isSafeInteger(value)) {
    throw badRequest("INVALID_HEADER", "content-length header is invalid");
  }

  return value;
}

function readRequestMimeType(ctx: Context): string | undefined {
  const contentType = ctx.get("content-type").trim();
  return contentType || undefined;
}

function createSizeLimitedStream(maxBytes: number): Transform {
  let bytesRead = 0;

  return new Transform({
    transform(chunk, _encoding, callback) {
      const chunkSize = Buffer.isBuffer(chunk)
        ? chunk.length
        : Buffer.byteLength(String(chunk));
      bytesRead += chunkSize;

      if (bytesRead > maxBytes) {
        callback(createFileTooLargeError());
        return;
      }

      callback(null, chunk);
    },
  });
}

function createFileTooLargeError() {
  return payloadTooLarge(
    "FILE_TOO_LARGE",
    `file size must be no more than ${config.oss.maxFileSizeBytes / 1024 / 1024} MB`
  );
}
