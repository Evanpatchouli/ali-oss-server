import { IMAGE_MIME_TYPES } from "./constants.js";
import { AliOssServerSdkError } from "./errors.js";
import { byteLength } from "./binary.js";
import type { BinaryInput } from "./types.js";

export function validateImage(
  buffer: BinaryInput,
  mimeType: string,
  maxBytes: number
): void {
  if (byteLength(buffer) <= 0) {
    throw new AliOssServerSdkError("image buffer is required", {
      code: "INVALID_IMAGE",
    });
  }

  if (!IMAGE_MIME_TYPES.has(mimeType)) {
    throw new AliOssServerSdkError(
      "only png, jpg, webp and gif images are supported",
      {
        code: "INVALID_IMAGE_TYPE",
      }
    );
  }

  if (byteLength(buffer) > maxBytes) {
    throw new AliOssServerSdkError(
      `image size must be no more than ${maxBytes} bytes`,
      {
        code: "IMAGE_TOO_LARGE",
      }
    );
  }
}
