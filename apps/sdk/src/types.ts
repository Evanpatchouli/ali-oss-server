import type { Readable } from "node:stream";

export type BinaryInput = ArrayBuffer | ArrayBufferView;

export type AliOssServerSdkOptions = {
  serverBaseUrl: string;
  clientId: string;
  clientSecret: string;
  bucket?: string;
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
  bucket?: string;
  clientId?: string;
};

export type DeleteObjectOptions = {
  bucket?: string;
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
  bucket?: string;
};

export type UploadImageInput = {
  buffer: BinaryInput;
  originalName?: string;
  mimeType: string;
  objectKey?: string;
  objectPrefix?: string;
  maxBytes?: number;
  bucket?: string;
};

export type UploadStreamInput = {
  stream: Readable;
  signal?: AbortSignal;
  fileName?: string;
  mimeType?: string;
  contentLength?: number;
  objectKey?: string;
  randomFilename?: boolean;
  bucket?: string;
};
