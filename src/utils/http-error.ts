export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly expose: boolean;

  constructor(status: number, code: string, message: string, expose = true) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.expose = expose;
  }
}

export function badRequest(code: string, message: string): HttpError {
  return new HttpError(400, code, message);
}

export function unauthorized(code = "UNAUTHORIZED", message = "Unauthorized"): HttpError {
  return new HttpError(401, code, message);
}
