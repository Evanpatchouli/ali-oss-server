import { createHmac, randomUUID } from "node:crypto";
import type { Readable } from "node:stream";

export type BinaryInput = ArrayBuffer | ArrayBufferView;

export type AliOssServerSdkOptions = {
  serverBaseUrl: string;
  clientId: string;
  clientSecret: string;
  objectPrefix?: string;
  imageMaxBytes?: number;
  tokenRefreshBufferMs?: number;
  tokenRefreshIntervalMs?: number;
  onTokenRefreshError?: (error: unknown) => void;
  fetch?: typeof fetch;
};

export type AliOssUploadResult = {
  objectKey: string;
  url: string;
  bucket: string;
  clientId?: string;
};

export type AliOssDeleteResult = {
  objectKey: string;
  deleted: true;
  clientId?: string;
};

export type AliOssTokenResult = {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  expiresAt: string;
  clientId: string;
};

export type UploadBufferInput = {
  buffer: BinaryInput;
  fileName?: string;
  mimeType?: string;
  objectKey?: string;
  randomFilename?: boolean;
};

export type UploadImageInput = {
  buffer: BinaryInput;
  originalName?: string;
  mimeType: string;
  objectKey?: string;
  objectPrefix?: string;
  maxBytes?: number;
};

export type UploadStreamInput = {
  stream: Readable;
  fileName?: string;
  mimeType?: string;
  contentLength?: number;
  objectKey?: string;
  randomFilename?: boolean;
};

type SdkErrorOptions = {
  status?: number;
  code?: string;
  responseBody?: unknown;
};

const DEFAULT_TOKEN_REFRESH_BUFFER_MS = 60_000;
const DEFAULT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export class AliOssServerSdkError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly responseBody?: unknown;

  constructor(message: string, options: SdkErrorOptions = {}) {
    super(message);
    this.name = "AliOssServerSdkError";
    this.status = options.status;
    this.code = options.code;
    this.responseBody = options.responseBody;
  }
}

export class AliOssServerSdk {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly objectPrefix: string;
  private readonly imageMaxBytes: number;
  private readonly tokenRefreshBufferMs: number;
  private readonly tokenRefreshIntervalMs: number;
  private readonly onTokenRefreshError?: (error: unknown) => void;
  private readonly fetchFn: typeof fetch;

  private accessToken = "";
  private expiresAtMs = 0;
  private expiresIn = 0;
  private refreshPromise: Promise<AliOssTokenResult> | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: AliOssServerSdkOptions) {
    this.baseUrl = normalizeRequiredUrl(options.serverBaseUrl, "serverBaseUrl");
    this.clientId = normalizeRequiredString(options.clientId, "clientId");
    this.clientSecret = normalizeRequiredString(options.clientSecret, "clientSecret");
    this.objectPrefix = normalizePrefix(options.objectPrefix ?? "uploads");
    this.imageMaxBytes = options.imageMaxBytes ?? DEFAULT_IMAGE_MAX_BYTES;
    this.tokenRefreshBufferMs = options.tokenRefreshBufferMs ?? DEFAULT_TOKEN_REFRESH_BUFFER_MS;
    this.tokenRefreshIntervalMs = options.tokenRefreshIntervalMs ?? 0;
    this.onTokenRefreshError = options.onTokenRefreshError;
    this.fetchFn = options.fetch ?? globalThis.fetch;

    if (!this.fetchFn) {
      throw new AliOssServerSdkError("fetch is not available in this Node runtime");
    }
  }

  startTokenRefresh(intervalMs = this.tokenRefreshIntervalMs): void {
    if (intervalMs <= 0) {
      return;
    }

    this.stopTokenRefresh();
    void this.refreshToken(true).catch((error: unknown) => {
      this.onTokenRefreshError?.(error);
    });
    this.refreshTimer = setInterval(() => {
      void this.refreshToken(true).catch((error: unknown) => {
        this.onTokenRefreshError?.(error);
      });
    }, intervalMs);

    const timer = this.refreshTimer as ReturnType<typeof setInterval> & { unref?: () => void };
    timer.unref?.();
  }

  stopTokenRefresh(): void {
    if (!this.refreshTimer) {
      return;
    }

    clearInterval(this.refreshTimer);
    this.refreshTimer = null;
  }

  async getAccessToken(): Promise<string> {
    await this.ensureToken();
    return this.accessToken;
  }

  async refreshToken(force = false): Promise<AliOssTokenResult> {
    if (!force && this.hasFreshToken()) {
      return this.currentToken();
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.requestToken().finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  async uploadImage(input: UploadImageInput): Promise<AliOssUploadResult> {
    validateImage(input.buffer, input.mimeType, input.maxBytes ?? this.imageMaxBytes);

    const fileName = input.originalName?.trim() || "image";
    return this.uploadBuffer({
      buffer: input.buffer,
      fileName,
      mimeType: input.mimeType,
      objectKey: input.objectKey ?? this.buildObjectKey(fileName, input.objectPrefix),
    });
  }

  async uploadBuffer(input: UploadBufferInput): Promise<AliOssUploadResult> {
    await this.ensureToken();

    const fileName = input.fileName?.trim() || "file";
    const mimeType = input.mimeType?.trim() || "application/octet-stream";
    const formData = new FormData();
    formData.append("file", new Blob([toArrayBuffer(input.buffer)], { type: mimeType }), fileName);

    if (input.objectKey) {
      formData.append("objectKey", input.objectKey);
    }

    if (input.randomFilename !== undefined) {
      formData.append("randomFilename", String(input.randomFilename));
    }

    const body = await this.requestJson<Partial<AliOssUploadResult>>("/api/oss/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    return readUploadResult(body);
  }

  async uploadStream(input: UploadStreamInput): Promise<AliOssUploadResult> {
    await this.ensureToken();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": input.mimeType?.trim() || "application/octet-stream",
    };

    if (input.fileName?.trim()) {
      headers["x-file-name"] = input.fileName.trim();
    }

    if (input.objectKey?.trim()) {
      headers["x-object-key"] = input.objectKey.trim();
    }

    if (input.randomFilename !== undefined) {
      headers["x-random-filename"] = String(input.randomFilename);
    }

    if (input.contentLength !== undefined) {
      headers["content-length"] = String(input.contentLength);
    }

    const init: RequestInit & { duplex: "half" } = {
      method: "POST",
      headers,
      body: input.stream as unknown as RequestInit["body"],
      duplex: "half",
    };
    const body = await this.requestJson<Partial<AliOssUploadResult>>("/api/oss/upload-stream", init);

    return readUploadResult(body);
  }

  async deleteObject(objectKey: string): Promise<AliOssDeleteResult> {
    await this.ensureToken();

    const body = await this.requestJson<Partial<AliOssDeleteResult>>("/api/oss/object", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ objectKey }),
    });

    if (!body.objectKey || body.deleted !== true) {
      throw new AliOssServerSdkError("OSS object delete response is invalid", { responseBody: body });
    }

    return {
      objectKey: body.objectKey,
      deleted: true,
      clientId: body.clientId,
    };
  }

  private async ensureToken(): Promise<void> {
    if (!this.hasFreshToken()) {
      await this.refreshToken();
    }
  }

  private hasFreshToken(): boolean {
    return Boolean(this.accessToken && this.expiresAtMs - Date.now() > this.tokenRefreshBufferMs);
  }

  private currentToken(): AliOssTokenResult {
    return {
      tokenType: "Bearer",
      accessToken: this.accessToken,
      expiresIn: this.expiresIn,
      expiresAt: new Date(this.expiresAtMs).toISOString(),
      clientId: this.clientId,
    };
  }

  private async requestToken(): Promise<AliOssTokenResult> {
    const sign = createHmac("sha256", this.clientSecret).update(this.clientId).digest("base64url");
    const body = await this.requestJson<Partial<AliOssTokenResult>>("/api/auth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": this.clientId,
      },
      body: JSON.stringify({ sign }),
    });

    if (!body.accessToken || !body.expiresAt || !body.clientId) {
      throw new AliOssServerSdkError("OSS token response is invalid", { responseBody: body });
    }

    const expiresAtMs = new Date(body.expiresAt).getTime();
    if (!Number.isFinite(expiresAtMs)) {
      throw new AliOssServerSdkError("OSS token expiresAt is invalid", { responseBody: body });
    }

    this.accessToken = body.accessToken;
    this.expiresAtMs = expiresAtMs;
    this.expiresIn = body.expiresIn ?? Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));

    return this.currentToken();
  }

  private async requestJson<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.fetchFn(this.joinUrl(path), init);
    const body = (await response.json().catch(() => null)) as T | null;

    if (!response.ok) {
      throw new AliOssServerSdkError(readResponseMessage(body, response.statusText), {
        status: response.status,
        code: readResponseCode(body),
        responseBody: body,
      });
    }

    if (body === null) {
      throw new AliOssServerSdkError("OSS server response is not valid JSON", {
        status: response.status,
      });
    }

    return body;
  }

  private buildObjectKey(originalName: string, objectPrefix?: string): string {
    const now = new Date();
    const dayPath = now.toISOString().slice(0, 10).replaceAll("-", "/");
    const prefix = normalizePrefix(objectPrefix ?? this.objectPrefix);
    const filename = sanitizeFilename(originalName);
    return [prefix, dayPath, `${Date.now()}-${randomUUID()}-${filename}`].filter(Boolean).join("/");
  }

  private joinUrl(path: string): string {
    return `${this.baseUrl}${path}`;
  }
}

export function createAliOssServerSdk(options: AliOssServerSdkOptions): AliOssServerSdk {
  return new AliOssServerSdk(options);
}

function readUploadResult(body: Partial<AliOssUploadResult>): AliOssUploadResult {
  if (!body.objectKey || !body.url || !body.bucket) {
    throw new AliOssServerSdkError("OSS upload response is invalid", { responseBody: body });
  }

  return {
    objectKey: body.objectKey,
    url: body.url,
    bucket: body.bucket,
    clientId: body.clientId,
  };
}

function validateImage(buffer: BinaryInput, mimeType: string, maxBytes: number): void {
  if (byteLength(buffer) <= 0) {
    throw new AliOssServerSdkError("image buffer is required", { code: "INVALID_IMAGE" });
  }

  if (!IMAGE_MIME_TYPES.has(mimeType)) {
    throw new AliOssServerSdkError("only png, jpg, webp and gif images are supported", {
      code: "INVALID_IMAGE_TYPE",
    });
  }

  if (byteLength(buffer) > maxBytes) {
    throw new AliOssServerSdkError(`image size must be no more than ${maxBytes} bytes`, {
      code: "IMAGE_TOO_LARGE",
    });
  }
}

function normalizeRequiredUrl(value: string, fieldName: string): string {
  const normalized = normalizeRequiredString(value, fieldName).replace(/\/+$/u, "");

  try {
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Invalid protocol");
    }
  } catch {
    throw new AliOssServerSdkError(`${fieldName} must be an absolute http(s) URL`);
  }

  return normalized;
}

function normalizeRequiredString(value: string, fieldName: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new AliOssServerSdkError(`${fieldName} is required`);
  }

  return normalized;
}

function normalizePrefix(value: string): string {
  return value.trim().replaceAll("\\", "/").replace(/^\/+|\/+$/gu, "");
}

function sanitizeFilename(originalName: string): string {
  const filename = originalName.trim() || "file";
  const sanitized = filename
    .replace(/[\\/:*?"<>|]+/gu, "-")
    .replace(/[\x00-\x1F\x7F]+/gu, "")
    .trim();
  return (sanitized || "file").slice(0, 180);
}

function toArrayBuffer(input: BinaryInput): ArrayBuffer {
  if (input instanceof ArrayBuffer) {
    return input.slice(0);
  }

  const view = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  const copied = new Uint8Array(view.byteLength);
  copied.set(view);
  return copied.buffer;
}

function byteLength(input: BinaryInput): number {
  return input instanceof ArrayBuffer ? input.byteLength : input.byteLength;
}

function readResponseMessage(body: unknown, fallback: string): string {
  if (isRecord(body)) {
    if (typeof body.message === "string") {
      return body.message;
    }

    if (isRecord(body.error) && typeof body.error.message === "string") {
      return body.error.message;
    }
  }

  return fallback || "OSS server request failed";
}

function readResponseCode(body: unknown): string | undefined {
  if (isRecord(body) && isRecord(body.error) && typeof body.error.code === "string") {
    return body.error.code;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
