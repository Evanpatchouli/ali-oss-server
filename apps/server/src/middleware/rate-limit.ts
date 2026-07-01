import type { Middleware } from "koa";

import {
  checkRateLimit,
  shouldApplyRateLimit,
} from "../services/rate-limit-service.js";
import { tooManyRequests } from "../utils/http-error.js";
import { normalizeOptionalIp } from "../utils/ip.js";

/**
 * Applies in-memory per-IP rate limits to API and health routes.
 */
export function enforceRateLimit(): Middleware {
  return async (ctx, next) => {
    if (!shouldApplyRateLimit(ctx.path)) {
      await next();
      return;
    }

    const identifier =
      (normalizeOptionalIp(ctx.ip) ?? ctx.ip.trim()) || "unknown";
    const result = checkRateLimit({
      identifier,
      method: ctx.method,
      path: ctx.path,
    });

    if (!result.allowed) {
      ctx.set("retry-after", Math.ceil(result.retryAfterMs / 1000).toString());
      throw tooManyRequests("RATE_LIMITED", "Too many requests");
    }

    await next();
  };
}
