import type { Middleware } from "koa";

import { HttpError } from "../utils/http-error.js";

type ErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};

/**
 * Converts thrown errors into stable JSON API responses.
 */
export function errorHandler(): Middleware {
  return async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      const response = toErrorResponse(error);
      ctx.status = response.status;
      ctx.body = response.body;

      if (response.status >= 500) {
        ctx.app.emit("error", error, ctx);
      }
    }
  };
}

function toErrorResponse(error: unknown): { status: number; body: ErrorResponse } {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.expose ? error.message : "Internal Server Error",
        },
      },
    };
  }

  if (isHttpErrorLike(error)) {
    const status = normalizeStatus(error.status);
    return {
      status,
      body: {
        error: {
          code: status >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR",
          message: error.expose === false ? "Internal Server Error" : error.message,
        },
      },
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal Server Error",
      },
    },
  };
}

function isHttpErrorLike(value: unknown): value is { status: number; message: string; expose?: boolean } {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    "message" in value &&
    typeof (value as { status?: unknown }).status === "number" &&
    typeof (value as { message?: unknown }).message === "string"
  );
}

function normalizeStatus(status: number): number {
  return status >= 400 && status <= 599 ? status : 500;
}
