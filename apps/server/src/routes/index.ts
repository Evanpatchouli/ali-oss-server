import Router from "@koa/router";

import { createAdminRouter } from "./admin-routes.js";
import { createAuthRouter } from "./auth-routes.js";
import { createOssRouter } from "./oss-routes.js";

/**
 * Creates the full application router.
 */
export function createRouter(): Router {
  const router = new Router();
  const adminRouter = createAdminRouter();
  const authRouter = createAuthRouter();
  const ossRouter = createOssRouter();

  router.get("/health", (ctx) => {
    ctx.body = {
      status: "ok",
      uptime: process.uptime(),
    };
  });

  router.use(adminRouter.routes());
  router.use(adminRouter.allowedMethods());
  router.use(authRouter.routes());
  router.use(authRouter.allowedMethods());
  router.use(ossRouter.routes());
  router.use(ossRouter.allowedMethods());

  return router;
}
