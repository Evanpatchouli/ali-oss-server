import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";

process.env.TOKEN_SECRET = "test-token-secret-0123456789";
process.env.ADMIN_USERNAME = "test-admin";
process.env.ADMIN_PASSWORD = "test-password";
process.env.OSS_BUCKETS = JSON.stringify([
  { name: "alpha-bucket", region: "oss-cn-alpha" },
  { name: "beta-bucket", region: "oss-cn-beta" },
]);
process.env.OSS_ACCESS_KEY_ID = "test-access-key";
process.env.OSS_ACCESS_KEY_SECRET = "test-access-secret";

const { parseOssBuckets } = await import("../src/config/env.ts");
const { resolveRequestBucket } = await import("../src/utils/bucket-request.ts");
const clientsModule = await import("../src/core/client.ts");
const defaultClient = clientsModule.default ?? clientsModule;
const clientPrototype = Object.getPrototypeOf(defaultClient);
const { uploadStream, deleteObject, listAdminBucketObjects } =
  await import("../src/services/oss-service.ts");

test("OSS_BUCKETS takes precedence and legacy configuration remains supported", () => {
  assert.deepEqual(
    parseOssBuckets({
      OSS_BUCKETS: '[{"name":"new","region":"oss-new"}]',
      OSS_BUCKET_NAME: "legacy",
      OSS_REGION: "oss-old",
    }),
    [{ name: "new", region: "oss-new" }]
  );
  assert.deepEqual(
    parseOssBuckets({
      OSS_BUCKET_NAME: "legacy",
      OSS_REGION: "oss-old",
    }),
    [{ name: "legacy", region: "oss-old" }]
  );
  for (const value of ["", "{}", "[]", "[{}]"]) {
    assert.throws(() => parseOssBuckets({ OSS_BUCKETS: value }));
  }
  assert.throws(
    () =>
      parseOssBuckets({
        OSS_BUCKETS: JSON.stringify([
          { name: "dup-bucket", region: "oss-cn-test" },
          { name: "dup-bucket", region: "oss-cn-test" },
        ]),
      }),
    (error) =>
      error.code === "ENV_INVALID" &&
      /duplicate bucket name/u.test(error.message)
  );
  for (const name of [
    "bad name",
    "UPPER",
    "a/b",
    "a\\b",
    "ab",
    "x".repeat(64),
  ]) {
    assert.throws(() =>
      parseOssBuckets({
        OSS_BUCKETS: JSON.stringify([{ name, region: "oss-cn-test" }]),
      })
    );
  }
  for (const region of [undefined, "", "oss-cn-test\n", "oss cn test"]) {
    assert.throws(() =>
      parseOssBuckets({
        OSS_BUCKETS: JSON.stringify([{ name: "valid-bucket", region }]),
      })
    );
  }
});

test("request bucket selection defaults only when absent and rejects conflicts or unknown values", () => {
  assert.equal(resolveRequestBucket({ headers: {} }), "alpha-bucket");
  assert.equal(
    resolveRequestBucket({ headers: { "x-oss-bucket": "beta-bucket" } }),
    "beta-bucket"
  );
  assert.equal(
    resolveRequestBucket({ headers: {}, body: { bucket: "beta-bucket" } }),
    "beta-bucket"
  );
  assert.equal(
    resolveRequestBucket({
      headers: { "x-oss-bucket": "beta-bucket" },
      body: { bucket: "beta-bucket" },
    }),
    "beta-bucket"
  );
  assert.throws(
    () =>
      resolveRequestBucket({
        headers: { "x-oss-bucket": "beta-bucket" },
        body: { bucket: "alpha-bucket" },
      }),
    /match/
  );
  assert.throws(() =>
    resolveRequestBucket({ headers: { "x-oss-bucket": "" } })
  );
  assert.throws(
    () => resolveRequestBucket({ headers: { "x-oss-bucket": "missing" } }),
    /configured/
  );
  assert.throws(() =>
    resolveRequestBucket({ headers: {}, body: { bucket: ["alpha-bucket"] } })
  );
  assert.throws(() =>
    resolveRequestBucket({
      headers: { "x-oss-bucket": "alpha-bucket" },
      rawHeaders: [
        "x-oss-bucket",
        "alpha-bucket",
        "X-Oss-Bucket",
        "alpha-bucket",
      ],
    })
  );
});

test("service operations keep bucket clients and URL generation isolated", async () => {
  const names = ["putStream", "delete", "listV2", "generateObjectUrl"];
  const originals = Object.fromEntries(
    names.map((name) => [name, clientPrototype[name]])
  );
  const calls = [];
  clientPrototype.generateObjectUrl = function (key) {
    return `https://${this.options.bucket}.example/${key}`;
  };
  clientPrototype.putStream = async function (key) {
    calls.push([this.options.bucket, "put", key]);
    return { name: key };
  };
  clientPrototype.delete = async function (key) {
    calls.push([this.options.bucket, "delete", key]);
    return {};
  };
  clientPrototype.listV2 = async function () {
    return { objects: [{ name: `${this.options.bucket}-object.txt` }] };
  };

  try {
    const uploaded = await Promise.all([
      uploadStream({
        bucket: "alpha-bucket",
        clientId: "client-a",
        objectKey: "a.txt",
        stream: Readable.from(["a"]),
      }),
      uploadStream({
        bucket: "beta-bucket",
        clientId: "client-b",
        objectKey: "b.txt",
        stream: Readable.from(["b"]),
      }),
    ]);
    assert.deepEqual(
      uploaded.map(({ bucket, objectKey, url }) => [bucket, objectKey, url]),
      [
        [
          "alpha-bucket",
          "client-a/a.txt",
          "https://alpha-bucket.example/client-a/a.txt",
        ],
        [
          "beta-bucket",
          "client-b/b.txt",
          "https://beta-bucket.example/client-b/b.txt",
        ],
      ]
    );
    assert.deepEqual(
      await deleteObject({
        bucket: "beta-bucket",
        clientId: "client-b",
        objectKey: "b.txt",
      }),
      {
        objectKey: "client-b/b.txt",
        deleted: true,
        bucket: "beta-bucket",
      }
    );
    const listed = await listAdminBucketObjects({ bucket: "beta-bucket" });
    assert.equal(
      listed.objects[0].url,
      "https://beta-bucket.example/beta-bucket-object.txt"
    );
    assert.equal(listed.bucket, "beta-bucket");
    assert.deepEqual(calls, [
      ["alpha-bucket", "put", "client-a/a.txt"],
      ["beta-bucket", "put", "client-b/b.txt"],
      ["beta-bucket", "delete", "client-b/b.txt"],
    ]);
  } finally {
    for (const name of names) clientPrototype[name] = originals[name];
  }
});
