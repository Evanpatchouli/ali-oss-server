const UTF8_FILENAME_PREFIX = "UTF-8''";

/** Builds the compatible filename header pair for a stream upload. */
export function createFileNameHeaders(
  input: string | undefined
): Record<string, string> {
  const fileName = input?.trim();
  if (!fileName) {
    return {};
  }

  if (/^[\x20-\x7E]+$/u.test(fileName)) {
    return { "x-file-name": fileName };
  }

  return {
    "x-file-name-utf8": `${UTF8_FILENAME_PREFIX}${encodeUtf8FileName(fileName)}`,
  };
}

function encodeUtf8FileName(fileName: string): string {
  return encodeURIComponent(fileName).replace(
    /[!'()*]/gu,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}
