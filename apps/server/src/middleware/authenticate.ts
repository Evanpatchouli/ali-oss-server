import type { Middleware } from "koa";

import { unauthorized } from "../utils/http-error.js";
import { verifyAccessToken, type VerifiedAccessToken } from "../utils/token.js";

declare module "koa" {
  interface DefaultState {
    auth?: VerifiedAccessToken;
  }
}

/**
 * Requires a valid bearer token and stores caller identity on ctx.state.auth.
 */
export function authenticate(): Middleware {
  return async (ctx, next) => {
    const token = readBearerToken(ctx.get("authorization"));
    ctx.state.auth = verifyAccessToken(token);
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
