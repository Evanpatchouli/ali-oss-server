import Router from "@koa/router";

import { createAuthRouter } from "./auth-routes.js";
import { createOssRouter } from "./oss-routes.js";

/**
 * Creates the full application router.
 */
export function createRouter(): Router {
  const router = new Router();
  const authRouter = createAuthRouter();
  const ossRouter = createOssRouter();

  router.get("/health", (ctx) => {
    ctx.body = {
      status: "ok",
      uptime: process.uptime(),
    };
  });

  router.use(authRouter.routes());
  router.use(authRouter.allowedMethods());
  router.use(ossRouter.routes());
  router.use(ossRouter.allowedMethods());

  return router;
}
