import { access } from "node:fs/promises";

import type { Middleware } from "koa";
import send from "koa-send";

import { serviceUnavailable } from "../utils/http-error.js";
import { adminIndexHtmlPath, adminDistDirectory } from "../utils/paths.js";

/**
 * Serves the built admin SPA from /admin.
 */
export function serveAdminStatic(): Middleware {
  return async (ctx, next) => {
    if (!isAdminStaticRequest(ctx.method, ctx.path)) {
      await next();
      return;
    }

    await assertAdminBuildExists();

    const relativePath = resolveRelativeAdminPath(ctx.path);
    if (relativePath === "index.html") {
      await send(ctx, relativePath, { root: adminDistDirectory });
      return;
    }

    try {
      await send(ctx, relativePath, { root: adminDistDirectory });
    } catch (error) {
      if (isNotFoundError(error) && !hasFileExtension(relativePath)) {
        await send(ctx, "index.html", { root: adminDistDirectory });
        return;
      }

      throw error;
    }
  };
}

function isAdminStaticRequest(method: string, path: string): boolean {
  return (
    (method === "GET" || method === "HEAD") &&
    (path === "/admin" || path.startsWith("/admin/"))
  );
}

async function assertAdminBuildExists(): Promise<void> {
  try {
    await access(adminIndexHtmlPath);
  } catch {
    throw serviceUnavailable("ADMIN_UI_NOT_BUILT", "Admin UI is not built yet");
  }
}

function resolveRelativeAdminPath(path: string): string {
  if (path === "/admin" || path === "/admin/") {
    return "index.html";
  }

  const relativePath = path.slice("/admin/".length);
  return relativePath || "index.html";
}

function hasFileExtension(path: string): boolean {
  return /\.[a-z0-9]+$/iu.test(path);
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: unknown }).status === 404
  );
}
