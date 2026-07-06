import { unlink } from "node:fs/promises";

import Router from "@koa/router";
import type { ScalarOrArrayFiles } from "koa-body";

import { authenticateAdmin } from "../middleware/authenticate-admin.js";
import { uploadAdminLocalFile } from "../services/oss-service.js";
import {
  getAllowedIps,
  isIpAllowlistEnabled,
} from "../services/ip-allowlist-service.js";
import {
  getRateLimitSettings,
  type RateLimitRule,
  type RouteRateLimitRule,
} from "../services/rate-limit-service.js";
import {
  updatePersistedIpAllowlist,
  updatePersistedRateLimitSettings,
} from "../services/runtime-state-service.js";
import { authenticateAdminUser } from "../services/admin-auth-service.js";
import { badRequest } from "../utils/http-error.js";
import { readObjectBody, readRequiredStringField } from "../utils/request.js";
import { signAdminAccessToken } from "../utils/token.js";

type UploadedFile = {
  filepath?: string;
  originalFilename?: string | null;
  mimetype?: string | null;
};

/**
 * Creates routes for admin login and in-memory policy management.
 */
export function createAdminRouter(): Router {
  const router = new Router({ prefix: "/api/admin" });

  router.post("/auth/login", (ctx) => {
    const body = readObjectBody(ctx);
    const username = readRequiredStringField(body, "username");
    const password = readRequiredStringField(body, "password");
    const admin = authenticateAdminUser(username, password);
    const token = signAdminAccessToken(admin.username);

    ctx.body = {
      tokenType: "Bearer",
      accessToken: token.token,
      expiresIn: token.expiresIn,
      expiresAt: token.expiresAt,
      username: admin.username,
    };
  });

  router.post("/oss/upload", authenticateAdmin(), async (ctx) => {
    const file = readUploadedFile(readRequestFiles(ctx));
    const body = readObjectBody(ctx);
    const objectKey = readRequiredStringField(body, "objectKey");

    try {
      const uploaded = await uploadAdminLocalFile({
        objectKey,
        localFilePath: file.filepath,
        originalFilename: file.originalFilename,
        mimeType: file.mimetype,
      });

      ctx.status = 201;
      ctx.body = uploaded;
    } finally {
      await removeTempFile(file.filepath);
    }
  });

  router.get("/ip-allowlist", authenticateAdmin(), (ctx) => {
    const ips = getAllowedIps();
    ctx.body = {
      ips,
      enabled: isIpAllowlistEnabled(),
    };
  });

  router.put("/ip-allowlist", authenticateAdmin(), async (ctx) => {
    const body = readObjectBody(ctx);
    const ips = readStringArray(body.ips, "ips");
    const nextIps = await updatePersistedIpAllowlist(ips);

    ctx.body = {
      ips: nextIps,
      enabled: nextIps.length > 0,
    };
  });

  router.get("/rate-limit", authenticateAdmin(), (ctx) => {
    ctx.body = getRateLimitSettings();
  });

  router.put("/rate-limit", authenticateAdmin(), async (ctx) => {
    const body = readObjectBody(ctx);
    const nextSettings = await updatePersistedRateLimitSettings({
      globalRule: readOptionalRateLimitRule(body.globalRule, "globalRule"),
      routeRules: readRouteRules(body.routeRules),
    });

    ctx.body = nextSettings;
  });

  return router;
}

function readStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value)) {
    throw badRequest(
      "INVALID_FIELD",
      `${fieldName} must be an array of strings`
    );
  }

  return value.map((item, index) => {
    if (typeof item !== "string") {
      throw badRequest(
        "INVALID_FIELD",
        `${fieldName}[${index}] must be a string`
      );
    }

    const normalized = item.trim();
    if (!normalized) {
      throw badRequest(
        "INVALID_FIELD",
        `${fieldName}[${index}] must not be empty`
      );
    }

    return normalized;
  });
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

function readOptionalRateLimitRule(
  value: unknown,
  fieldName: string
): RateLimitRule | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!isRecord(value)) {
    throw badRequest("INVALID_FIELD", `${fieldName} must be an object or null`);
  }

  return {
    windowMs: readPositiveInteger(value.windowMs, `${fieldName}.windowMs`),
    maxRequests: readPositiveInteger(
      value.maxRequests,
      `${fieldName}.maxRequests`
    ),
  };
}

function readRouteRules(value: unknown): RouteRateLimitRule[] {
  if (!Array.isArray(value)) {
    throw badRequest("INVALID_FIELD", "routeRules must be an array");
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw badRequest(
        "INVALID_FIELD",
        `routeRules[${index}] must be an object`
      );
    }

    return {
      method: readNonEmptyString(item.method, `routeRules[${index}].method`),
      path: readNonEmptyString(item.path, `routeRules[${index}].path`),
      windowMs: readPositiveInteger(
        item.windowMs,
        `routeRules[${index}].windowMs`
      ),
      maxRequests: readPositiveInteger(
        item.maxRequests,
        `routeRules[${index}].maxRequests`
      ),
    };
  });
}

function readPositiveInteger(value: unknown, fieldName: string): number {
  if (!Number.isInteger(value) || typeof value !== "number" || value <= 0) {
    throw badRequest(
      "INVALID_FIELD",
      `${fieldName} must be a positive integer`
    );
  }

  return value;
}

function readNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw badRequest(
      "INVALID_FIELD",
      `${fieldName} must be a non-empty string`
    );
  }

  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
