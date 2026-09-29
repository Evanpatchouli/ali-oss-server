import { badRequest } from "./http-error.js";

const UTF8_FILENAME_PREFIX = "UTF-8''";
const ENCODED_NAME = /^(?:[A-Za-z0-9!#$&+.^_`|~-]|%[0-9A-Fa-f]{2})+$/u;
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/u;

/** Reads either the legacy literal filename header or the encoded UTF-8 form. */
export function readStreamFileName(headers: {
  "x-file-name"?: string | string[];
  "x-file-name-utf8"?: string | string[];
}): string | undefined {
  const hasLegacy = headers["x-file-name"] !== undefined;
  const hasEncoded = headers["x-file-name-utf8"] !== undefined;

  if (hasLegacy && hasEncoded) {
    throw badRequest(
      "INVALID_FILE_NAME_HEADER",
      "Only one file name header may be provided"
    );
  }

  if (hasLegacy) {
    const value = headers["x-file-name"]!;
    const literalValue = Array.isArray(value) ? value.join(", ") : value;
    if (CONTROL_CHARACTERS.test(literalValue)) {
      throw invalidEncodedFileName();
    }
    return literalValue.trim() || undefined;
  }

  if (!hasEncoded) {
    return undefined;
  }

  const rawValue = headers["x-file-name-utf8"]!;
  if (Array.isArray(rawValue)) {
    throw invalidEncodedFileName();
  }
  const value = rawValue;
  if (!value.startsWith(UTF8_FILENAME_PREFIX)) {
    throw invalidEncodedFileName();
  }

  const encodedName = value.slice(UTF8_FILENAME_PREFIX.length);
  if (!ENCODED_NAME.test(encodedName)) {
    throw invalidEncodedFileName();
  }

  let fileName: string;
  try {
    const bytes = Uint8Array.from(
      encodedName.match(/%[\da-f]{2}|./giu) ?? [],
      (character) =>
        character.startsWith("%")
          ? Number.parseInt(character.slice(1), 16)
          : character.charCodeAt(0)
    );
    fileName = new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: true,
    }).decode(bytes);
  } catch {
    throw invalidEncodedFileName();
  }

  if (!fileName || CONTROL_CHARACTERS.test(fileName)) {
    throw invalidEncodedFileName();
  }

  const normalizedFileName = fileName.trim();
  if (!normalizedFileName) {
    throw invalidEncodedFileName();
  }

  return normalizedFileName;
}

function invalidEncodedFileName() {
  return badRequest(
    "INVALID_FILE_NAME_HEADER",
    "File name header contains an invalid value"
  );
}
