import assert from "node:assert/strict";
import test from "node:test";

import { readStreamFileName } from "../src/utils/file-name-header.ts";

const encoded = (fileName) =>
  `UTF-8''${encodeURIComponent(fileName).replace(
    /[!'()*]/gu,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  )}`;

test("decodes the UTF-8 filename protocol for representative names", () => {
  for (const fileName of [
    "hello.txt",
    "résumé.txt",
    "项目资料 你好.txt",
    "hello world.txt",
    "a#b.txt",
    "100%.txt",
    "😀.txt",
  ]) {
    assert.equal(
      readStreamFileName({ "x-file-name-utf8": encoded(fileName) }),
      fileName
    );
  }
});

test("keeps the legacy filename header literal and rejects ambiguous or invalid encoded values", async () => {
  assert.equal(
    readStreamFileName({ "x-file-name": "%E9%A1%B9.txt" }),
    "%E9%A1%B9.txt"
  );
  assert.equal(
    readStreamFileName({ "x-file-name": "100% # report.txt" }),
    "100% # report.txt"
  );
  assert.equal(
    readStreamFileName({ "x-file-name": "  report.txt  " }),
    "report.txt"
  );
  assert.equal(readStreamFileName({ "x-file-name": "   " }), undefined);
  assert.equal(readStreamFileName({}), undefined);

  for (const headers of [
    { "x-file-name": "plain.txt", "x-file-name-utf8": encoded("项目.txt") },
    { "x-file-name-utf8": "" },
    { "x-file-name-utf8": "ISO-8859-1''file.txt" },
    { "x-file-name-utf8": "UTF-8''bad name.txt" },
    { "x-file-name-utf8": "UTF-8''bad%2.txt" },
    { "x-file-name-utf8": "UTF-8''%FF.txt" },
    { "x-file-name-utf8": "UTF-8''bad%0Aname.txt" },
    { "x-file-name-utf8": "UTF-8''bad\nname.txt" },
    { "x-file-name-utf8": "UTF-8''%20" },
    { "x-file-name": "bad\tname.txt" },
    { "x-file-name": "bad\u0085name.txt" },
  ]) {
    assert.throws(() => readStreamFileName(headers), {
      status: 400,
      code: "INVALID_FILE_NAME_HEADER",
    });
  }

  process.env.TOKEN_SECRET = "test-token-secret-0123456789";
  process.env.ADMIN_USERNAME = "test-admin";
  process.env.ADMIN_PASSWORD = "test-password";
  process.env.OSS_REGION = "oss-cn-test";
  process.env.OSS_BUCKET_NAME = "test-bucket";
  process.env.OSS_ACCESS_KEY_ID = "test-access-key";
  process.env.OSS_ACCESS_KEY_SECRET = "test-access-secret";
  const { buildStreamUploadObjectKey } =
    await import("../src/services/oss-service.ts");
  const originalFileName = readStreamFileName({
    "x-file-name-utf8": encoded("folder/项目资料 📦.txt"),
  });
  assert.equal(originalFileName, "folder/项目资料 📦.txt");
  assert.equal(
    buildStreamUploadObjectKey({
      clientId: "client-123",
      fileName: originalFileName,
    }),
    "client-123/项目资料 📦.txt"
  );
  assert.equal(
    buildStreamUploadObjectKey({
      clientId: "client-123",
      fileName: readStreamFileName({ "x-file-name": "%E4%B8%AD.txt" }),
    }),
    "client-123/%E4%B8%AD.txt"
  );
  assert.equal(
    buildStreamUploadObjectKey({
      clientId: "client-123",
      fileName: readStreamFileName({
        "x-file-name-utf8": "UTF-8''%252E.txt",
      }),
    }),
    "client-123/%2E.txt"
  );
  assert.equal(
    buildStreamUploadObjectKey({
      clientId: "client-123",
      objectKey: "chosen.txt",
      fileName: originalFileName,
    }),
    "client-123/chosen.txt"
  );
});
