import { AliOssServerSdkError } from "./errors.js";
import { readResponseCode, readResponseMessage } from "./responses.js";

export async function requestJson<T>(
  fetchFn: typeof fetch,
  baseUrl: string,
  path: string,
  init: RequestInit
): Promise<T> {
  const response = await fetchFn(`${baseUrl}${path}`, init);
  const body = (await response.json().catch(() => null)) as T | null;

  if (!response.ok) {
    throw new AliOssServerSdkError(
      readResponseMessage(body, response.statusText),
      {
        status: response.status,
        code: readResponseCode(body),
        responseBody: body,
      }
    );
  }

  if (body === null) {
    throw new AliOssServerSdkError("OSS server response is not valid JSON", {
      status: response.status,
    });
  }

  return body;
}
