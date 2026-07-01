import type { Middleware } from "koa";

import {
  isIpAllowed,
  isIpAllowlistEnabled,
} from "../services/ip-allowlist-service.js";
import { forbidden } from "../utils/http-error.js";
import { normalizeOptionalIp } from "../utils/ip.js";

/**
 * Restricts incoming requests to the configured in-memory IP allowlist.
 */
export function enforceIpAllowlist(): Middleware {
  return async (ctx, next) => {
    if (!isIpAllowlistEnabled()) {
      await next();
      return;
    }

    const requestIp = normalizeOptionalIp(ctx.ip) ?? ctx.ip.trim();
    if (!isIpAllowed(requestIp)) {
      throw forbidden("IP_NOT_ALLOWED", `IP ${requestIp} is not allowed`);
    }

    await next();
  };
}
