import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";

process.env.TOKEN_SECRET = "test-token-secret-0123456789";
process.env.ADMIN_USERNAME = "test-admin";
process.env.ADMIN_PASSWORD = "test-password";
process.env.OSS_REGION = "oss-cn-test";
process.env.OSS_BUCKET_NAME = "test-bucket";
process.env.OSS_ACCESS_KEY_ID = "test-access-key";
process.env.OSS_ACCESS_KEY_SECRET = "test-access-secret";

const clientModule = await import("../src/core/client.ts");
const client = clientModule.default ?? clientModule;
const { deleteObject, uploadStream } =
  await import("../src/services/oss-service.ts");

test("upload stores and returns the final client-scoped key", async () => {
  const originalPutStream = client.putStream;
  const calls = [];
  client.putStream = async (objectKey) => {
    calls.push(objectKey);
    return { name: objectKey };
  };

  try {
    const relative = await uploadStream({
      clientId: "partner-a",
      objectKey: "uploads/a.txt",
      stream: Readable.from(["test"]),
    });
    const alreadyScoped = await uploadStream({
      clientId: "partner-a",
      objectKey: "partner-a/uploads/a.txt",
      stream: Readable.from(["test"]),
    });

    assert.deepEqual(calls, [
      "partner-a/uploads/a.txt",
      "partner-a/uploads/a.txt",
    ]);
    assert.equal(relative.objectKey, "partner-a/uploads/a.txt");
    assert.equal(alreadyScoped.objectKey, "partner-a/uploads/a.txt");
    assert.equal(relative.url, alreadyScoped.url);
    assert.match(relative.url, /^https?:\/\//u);
    assert.doesNotMatch(relative.url, /[?&](?:signature|expires)=/iu);
  } finally {
    client.putStream = originalPutStream;
  }
});

test("delete normalizes relative and already-scoped keys before OSS I/O", async () => {
  const originalDelete = client.delete;
  const calls = [];
  client.delete = async (objectKey) => {
    calls.push(objectKey);
    return {};
  };

  try {
    const relative = await deleteObject({
      clientId: "partner-a",
      objectKey: "uploads/a.txt",
    });
    const alreadyScoped = await deleteObject({
      clientId: "partner-a",
      objectKey: "partner-a/uploads/a.txt",
    });

    assert.deepEqual(calls, [
      "partner-a/uploads/a.txt",
      "partner-a/uploads/a.txt",
    ]);
    assert.deepEqual(relative, {
      objectKey: "partner-a/uploads/a.txt",
      deleted: true,
    });
    assert.deepEqual(alreadyScoped, relative);
  } finally {
    client.delete = originalDelete;
  }
});

test("OSS delete failures remain visible to the caller", async () => {
  const originalDelete = client.delete;
  const failure = new Error("OSS request failed");
  client.delete = async () => {
    throw failure;
  };

  try {
    await assert.rejects(
      deleteObject({ clientId: "partner-a", objectKey: "uploads/a.txt" }),
      (error) => error === failure
    );
  } finally {
    client.delete = originalDelete;
  }
});
