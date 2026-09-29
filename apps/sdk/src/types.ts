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
  signal?: AbortSignal;
  fileName?: string;
  mimeType?: string;
  contentLength?: number;
  objectKey?: string;
  randomFilename?: boolean;
};
