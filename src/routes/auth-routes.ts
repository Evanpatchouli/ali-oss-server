import Router from "@koa/router";

import { authenticateClient } from "../services/auth-service.js";
import { readObjectBody, readRequiredStringField } from "../utils/request.js";
import { signAccessToken } from "../utils/token.js";

/**
 * Creates routes for client credential authorization.
 */
export function createAuthRouter(): Router {
  const router = new Router({ prefix: "/api/auth" });

  router.post("/token", (ctx) => {
    const body = readObjectBody(ctx);
    const clientId = readRequiredStringField(body, "clientId");
    const clientSecret = readRequiredStringField(body, "clientSecret");
    const client = authenticateClient(clientId, clientSecret);
    const token = signAccessToken(client.clientId);

    ctx.body = {
      tokenType: "Bearer",
      accessToken: token.token,
      expiresIn: token.expiresIn,
      expiresAt: token.expiresAt,
      clientId: client.clientId,
    };
  });

  return router;
}
