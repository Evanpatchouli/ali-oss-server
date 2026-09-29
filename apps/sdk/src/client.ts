import { createHmac } from "node:crypto";
import { toArrayBuffer } from "./binary.js";
import {
  DEFAULT_IMAGE_MAX_BYTES,
  DEFAULT_TOKEN_REFRESH_BUFFER_MS,
} from "./constants.js";
import { AliOssServerSdkError } from "./errors.js";
import { requestJson } from "./http.js";
import {
  normalizePrefix,
  normalizeRequiredString,
  normalizeRequiredUrl,
} from "./normalize.js";
import { buildObjectKey } from "./object-key.js";
import { createFileNameHeaders } from "./file-name-header.js";
import { readUploadResult } from "./responses.js";
import type {
  AliOssDeleteResult,
  AliOssServerSdkOptions,
  AliOssTokenResult,
  AliOssUploadResult,
  UploadBufferInput,
  UploadImageInput,
  UploadStreamInput,
} from "./types.js";
import { validateImage } from "./validation.js";

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
    this.clientSecret = normalizeRequiredString(
      options.clientSecret,
      "clientSecret"
    );
    this.objectPrefix = normalizePrefix(options.objectPrefix ?? "uploads");
    this.imageMaxBytes = options.imageMaxBytes ?? DEFAULT_IMAGE_MAX_BYTES;
    this.tokenRefreshBufferMs =
      options.tokenRefreshBufferMs ?? DEFAULT_TOKEN_REFRESH_BUFFER_MS;
    this.tokenRefreshIntervalMs = options.tokenRefreshIntervalMs ?? 0;
    this.onTokenRefreshError = options.onTokenRefreshError;
    this.fetchFn = options.fetch ?? globalThis.fetch;

    if (!this.fetchFn) {
      throw new AliOssServerSdkError(
        "fetch is not available in this Node runtime"
      );
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

    const timer = this.refreshTimer as ReturnType<typeof setInterval> & {
      unref?: () => void;
    };
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
    validateImage(
      input.buffer,
      input.mimeType,
      input.maxBytes ?? this.imageMaxBytes
    );

    const fileName = input.originalName?.trim() || "image";
    return this.uploadBuffer({
      buffer: input.buffer,
      fileName,
      mimeType: input.mimeType,
      objectKey:
        input.objectKey ??
        buildObjectKey(fileName, input.objectPrefix ?? this.objectPrefix),
    });
  }

  async uploadBuffer(input: UploadBufferInput): Promise<AliOssUploadResult> {
    await this.ensureToken();

    const fileName = input.fileName?.trim() || "file";
    const mimeType = input.mimeType?.trim() || "application/octet-stream";
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([toArrayBuffer(input.buffer)], { type: mimeType }),
      fileName
    );

    if (input.objectKey) {
      formData.append("objectKey", input.objectKey);
    }

    if (input.randomFilename !== undefined) {
      formData.append("randomFilename", String(input.randomFilename));
    }

    const body = await requestJson<Partial<AliOssUploadResult>>(
      this.fetchFn,
      this.baseUrl,
      "/api/oss/upload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: formData,
      }
    );

    return readUploadResult(body);
  }

  async uploadStream(input: UploadStreamInput): Promise<AliOssUploadResult> {
    await this.ensureToken();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": input.mimeType?.trim() || "application/octet-stream",
    };

    Object.assign(headers, createFileNameHeaders(input.fileName));

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
    const body = await requestJson<Partial<AliOssUploadResult>>(
      this.fetchFn,
      this.baseUrl,
      "/api/oss/upload-stream",
      init
    );

    return readUploadResult(body);
  }

  async deleteObject(objectKey: string): Promise<AliOssDeleteResult> {
    await this.ensureToken();

    const body = await requestJson<Partial<AliOssDeleteResult>>(
      this.fetchFn,
      this.baseUrl,
      "/api/oss/object",
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ objectKey }),
      }
    );

    if (!body.objectKey || body.deleted !== true) {
      throw new AliOssServerSdkError("OSS object delete response is invalid", {
        responseBody: body,
      });
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
    return Boolean(
      this.accessToken &&
      this.expiresAtMs - Date.now() > this.tokenRefreshBufferMs
    );
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
    const sign = createHmac("sha256", this.clientSecret)
      .update(this.clientId)
      .digest("base64url");
    const body = await requestJson<Partial<AliOssTokenResult>>(
      this.fetchFn,
      this.baseUrl,
      "/api/auth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": this.clientId,
        },
        body: JSON.stringify({ sign }),
      }
    );

    if (!body.accessToken || !body.expiresAt || !body.clientId) {
      throw new AliOssServerSdkError("OSS token response is invalid", {
        responseBody: body,
      });
    }

    const expiresAtMs = new Date(body.expiresAt).getTime();
    if (!Number.isFinite(expiresAtMs)) {
      throw new AliOssServerSdkError("OSS token expiresAt is invalid", {
        responseBody: body,
      });
    }

    this.accessToken = body.accessToken;
    this.expiresAtMs = expiresAtMs;
    this.expiresIn =
      body.expiresIn ??
      Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));

    return this.currentToken();
  }
}

export function createAliOssServerSdk(
  options: AliOssServerSdkOptions
): AliOssServerSdk {
  return new AliOssServerSdk(options);
}
