import Koa from "koa";
import { HttpMethodEnum, koaBody } from "koa-body";

import { config } from "./config/env.js";
import { serveAdminStatic } from "./middleware/admin-static.js";
import { enforceIpAllowlist } from "./middleware/ip-allowlist.js";
import { enforceRateLimit } from "./middleware/rate-limit.js";
import { errorHandler } from "./middleware/error-handler.js";
import { createRouter } from "./routes/index.js";

/**
 * Builds the Koa application instance.
 */
export function createApp(): Koa {
  const app = new Koa();
  const router = createRouter();

  app.use(errorHandler());
  app.use(enforceIpAllowlist());
  app.use(enforceRateLimit());
  app.use(
    koaBody({
      json: true,
      urlencoded: true,
      multipart: true,
      parsedMethods: [
        HttpMethodEnum.POST,
        HttpMethodEnum.PUT,
        HttpMethodEnum.PATCH,
        HttpMethodEnum.DELETE,
      ],
      formidable: {
        multiples: false,
        keepExtensions: true,
        maxFileSize: config.oss.maxFileSizeBytes,
      },
    })
  );
  app.use(router.routes());
  app.use(router.allowedMethods());
  app.use(serveAdminStatic());
  app.use((ctx) => {
    if (ctx.status === 404 && ctx.body === undefined) {
      ctx.body = {
        error: {
          code: "NOT_FOUND",
          message: "Not Found",
        },
      };
    }
  });

  app.on("error", (error) => {
    console.error(error);
  });

  return app;
}
