import type { Middleware } from "koa";

import { unauthorized } from "../utils/http-error.js";
import {
  verifyAdminAccessToken,
  type VerifiedAdminAccessToken,
} from "../utils/token.js";

declare module "koa" {
  interface DefaultState {
    admin?: VerifiedAdminAccessToken;
  }
}

/**
 * Requires a valid admin bearer token and stores admin identity on ctx.state.admin.
 */
export function authenticateAdmin(): Middleware {
  return async (ctx, next) => {
    const token = readBearerToken(ctx.get("authorization"));
    ctx.state.admin = verifyAdminAccessToken(token);
    await next();
  };
}

function readBearerToken(headerValue: string): string {
  const match = /^Bearer\s+(.+)$/i.exec(headerValue.trim());
  if (!match) {
    throw unauthorized("TOKEN_REQUIRED", "Bearer token is required");
  }

  return match[1].trim();
}
