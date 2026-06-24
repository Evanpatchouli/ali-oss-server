import { unlink } from "node:fs/promises";

import Router from "@koa/router";
import type { ScalarOrArrayFiles } from "koa-body";

import { authenticate } from "../middleware/authenticate.js";
import { deleteObject, uploadLocalFile } from "../services/oss-service.js";
import { badRequest, unauthorized } from "../utils/http-error.js";
import {
  readObjectBody,
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
    const randomFilename = readOptionalBooleanField(body, "randomFilename") ?? false;

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

function readAuthenticatedClientId(ctx: { state: { auth?: { clientId: string } } }): string {
  const clientId = ctx.state.auth?.clientId;
  if (!clientId) {
    throw unauthorized("TOKEN_REQUIRED", "Bearer token is required");
  }

  return clientId;
}

function readRequestFiles(ctx: { request: unknown }): ScalarOrArrayFiles | undefined {
  return (ctx.request as { files?: ScalarOrArrayFiles }).files;
}

function readUploadedFile(files: unknown): Required<Pick<UploadedFile, "filepath">> & UploadedFile {
  if (!files || typeof files !== "object" || Array.isArray(files)) {
    throw badRequest("FILE_REQUIRED", "file is required");
  }

  const fileRecord = files as Record<string, UploadedFile | UploadedFile[]>;
  const explicitFile = fileRecord.file;
  const file = Array.isArray(explicitFile)
    ? explicitFile[0]
    : explicitFile ?? firstUploadedFile(fileRecord);

  if (!file?.filepath) {
    throw badRequest("FILE_REQUIRED", "file is required");
  }

  return { ...file, filepath: file.filepath };
}

function firstUploadedFile(files: Record<string, UploadedFile | UploadedFile[]>): UploadedFile | undefined {
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
