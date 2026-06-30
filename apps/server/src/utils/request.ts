import type { Context } from "koa";

import { badRequest } from "./http-error.js";

/**
 * Reads a JSON or form body as an object.
 */
export function readObjectBody(ctx: Context): Record<string, unknown> {
  const body = ctx.request.body;
  if (isRecord(body)) {
    return body;
  }

  throw badRequest("INVALID_BODY", "Request body must be an object");
}

export function readOptionalObjectBody(ctx: Context): Record<string, unknown> {
  const body = ctx.request.body;
  if (body === undefined || body === null) {
    return {};
  }

  if (isRecord(body)) {
    return body;
  }

  throw badRequest("INVALID_BODY", "Request body must be an object");
}

export function readRequiredStringField(source: Record<string, unknown>, fieldName: string): string {
  const value = readOptionalStringField(source, fieldName);
  if (!value) {
    throw badRequest("INVALID_FIELD", `${fieldName} is required`);
  }

  return value;
}

/**
 * Reads a required string request header.
 */
export function readRequiredHeader(ctx: Context, headerName: string): string {
  const value = ctx.get(headerName).trim();
  if (!value) {
    throw badRequest("INVALID_HEADER", `${headerName} header is required`);
  }

  return value;
}

/**
 * Reads an optional string request header.
 */
export function readOptionalHeader(ctx: Context, headerName: string): string | undefined {
  return normalizeString(ctx.get(headerName));
}

/**
 * Reads an optional boolean request header.
 */
export function readOptionalBooleanHeader(ctx: Context, headerName: string): boolean | undefined {
  const value = readOptionalHeader(ctx, headerName);
  if (value === undefined) {
    return undefined;
  }

  return parseBooleanValue(value, headerName);
}

export function readOptionalStringField(source: Record<string, unknown>, fieldName: string): string | undefined {
  const rawValue = source[fieldName];
  if (rawValue === undefined || rawValue === null) {
    return undefined;
  }

  if (Array.isArray(rawValue)) {
    if (rawValue.length !== 1 || typeof rawValue[0] !== "string") {
      throw badRequest("INVALID_FIELD", `${fieldName} must be a string`);
    }

    return normalizeString(rawValue[0]);
  }

  if (typeof rawValue !== "string") {
    throw badRequest("INVALID_FIELD", `${fieldName} must be a string`);
  }

  return normalizeString(rawValue);
}

export function readOptionalBooleanField(source: Record<string, unknown>, fieldName: string): boolean | undefined {
  const rawValue = source[fieldName];
  if (rawValue === undefined || rawValue === null) {
    return undefined;
  }

  if (Array.isArray(rawValue)) {
    if (rawValue.length !== 1) {
      throw badRequest("INVALID_FIELD", `${fieldName} must be a boolean`);
    }

    return parseBooleanValue(rawValue[0], fieldName);
  }

  return parseBooleanValue(rawValue, fieldName);
}

function normalizeString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized || undefined;
}

function parseBooleanValue(value: unknown, fieldName: string): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  throw badRequest("INVALID_FIELD", `${fieldName} must be true or false`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
