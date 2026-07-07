type SdkErrorOptions = {
  status?: number;
  code?: string;
  responseBody?: unknown;
};

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
