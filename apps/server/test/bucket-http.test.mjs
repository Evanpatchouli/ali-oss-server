import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";

process.env.TOKEN_SECRET = "bucket-http-test-token-secret";
process.env.ADMIN_USERNAME = "bucket-http-admin";
process.env.ADMIN_PASSWORD = "bucket-http-admin-password";
process.env.OSS_BUCKETS = JSON.stringify([
  { name: "alpha-bucket", region: "oss-cn-alpha" },
  { name: "beta-bucket", region: "oss-cn-beta" },
]);
process.env.OSS_ACCESS_KEY_ID = "fake-access-key";
process.env.OSS_ACCESS_KEY_SECRET = "fake-access-secret";
process.env.OSS_SECURE = "false";

const { createApp } = await import("../src/app.ts");
const clientModule = await import("../src/core/client.ts");
const defaultClient = clientModule.default ?? clientModule;
const clientPrototype = Object.getPrototypeOf(defaultClient);
const { replaceAuthClients } =
  await import("../src/services/auth-client-service.ts");
const { signAccessToken, signAdminAccessToken } =
  await import("../src/utils/token.ts");

test("real Koa routes select buckets, enforce auth and avoid OSS I/O on invalid requests", async (t) => {
  const client = { clientId: "partner-a", clientSecret: "partner-a-secret" };
  replaceAuthClients([client]);
  const oldClientToken = signAccessToken(
    client.clientId,
    client.clientSecret
  ).token;
  const adminToken = signAdminAccessToken(process.env.ADMIN_USERNAME).token;
  const originalMethods = Object.fromEntries(
    ["put", "putStream", "delete", "listV2", "generateObjectUrl"].map(
      (name) => [name, clientPrototype[name]]
    )
  );
  const ossCalls = [];
  clientPrototype.put = async function (key) {
    ossCalls.push({ operation: "put", bucket: this.options.bucket, key });
    return { name: key };
  };
  clientPrototype.putStream = async function (key) {
    ossCalls.push({ operation: "putStream", bucket: this.options.bucket, key });
    return { name: key };
  };
  clientPrototype.delete = async function (key) {
    ossCalls.push({ operation: "delete", bucket: this.options.bucket, key });
    return {};
  };
  clientPrototype.listV2 = async function () {
    ossCalls.push({ operation: "listV2", bucket: this.options.bucket });
    return {
      objects: [{ name: `${this.options.bucket}/sample.txt`, size: 4 }],
      isTruncated: false,
    };
  };
  clientPrototype.generateObjectUrl = function (key) {
    return `https://${this.options.bucket}.example/${key}`;
  };

  const app = createApp();
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
    for (const [name, method] of Object.entries(originalMethods))
      clientPrototype[name] = method;
    replaceAuthClients([]);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const request = (path, options = {}, token = oldClientToken) =>
    fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "content-type": "application/json" }),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  const json = async (response) => ({
    status: response.status,
    body: await response.json(),
  });
  const postJson = (path, body, headers = {}, token = oldClientToken) =>
    request(
      path,
      {
        method: "POST",
        body: JSON.stringify(body),
        headers,
      },
      token
    );

  try {
    const deniedBuckets = await json(
      await request("/api/admin/oss/buckets", {}, null)
    );
    assert.equal(deniedBuckets.status, 401);

    const configuredBuckets = await json(
      await request("/api/admin/oss/buckets", {}, adminToken)
    );
    assert.deepEqual(configuredBuckets, {
      status: 200,
      body: {
        buckets: [
          { name: "alpha-bucket", region: "oss-cn-alpha" },
          { name: "beta-bucket", region: "oss-cn-beta" },
        ],
        defaultBucket: "alpha-bucket",
      },
    });

    const defaultStream = await json(
      await request("/api/oss/upload-stream", {
        method: "POST",
        headers: { "content-type": "application/octet-stream" },
        body: "default stream",
      })
    );
    assert.equal(defaultStream.status, 201);
    assert.equal(defaultStream.body.bucket, "alpha-bucket");
    assert.equal(defaultStream.body.objectKey, "partner-a/file");

    const explicitStream = await json(
      await request("/api/oss/upload-stream", {
        method: "POST",
        headers: {
          "content-type": "application/octet-stream",
          "x-oss-bucket": "beta-bucket",
          "x-file-name": "b.txt",
        },
        body: "explicit stream",
      })
    );
    assert.equal(explicitStream.status, 201);
    assert.equal(explicitStream.body.bucket, "beta-bucket");
    assert.equal(explicitStream.body.objectKey, "partner-a/b.txt");
    assert.equal(
      explicitStream.body.url,
      "https://beta-bucket.example/partner-a/b.txt"
    );

    const multipart = new FormData();
    multipart.set("bucket", "beta-bucket");
    multipart.set("objectKey", "uploads/photo.jpg");
    multipart.set(
      "file",
      new Blob(["image"], { type: "image/jpeg" }),
      "photo.jpg"
    );
    const multipartUpload = await json(
      await request("/api/oss/upload", { method: "POST", body: multipart })
    );
    assert.equal(multipartUpload.status, 201);
    assert.equal(multipartUpload.body.bucket, "beta-bucket");
    assert.equal(multipartUpload.body.objectKey, "partner-a/uploads/photo.jpg");

    const deleteResult = await json(
      await request("/api/oss/object", {
        method: "DELETE",
        body: JSON.stringify({
          objectKey: "docs/readme.txt",
          bucket: "beta-bucket",
        }),
      })
    );
    assert.equal(deleteResult.status, 200);
    assert.equal(deleteResult.body.bucket, "beta-bucket");
    assert.equal(deleteResult.body.objectKey, "partner-a/docs/readme.txt");

    const beforeRejectedRequests = ossCalls.length;
    for (const [path, options, expectedCode] of [
      [
        "/api/oss/upload-stream",
        {
          method: "POST",
          headers: {
            "content-type": "application/octet-stream",
            "x-oss-bucket": "",
          },
          body: "x",
        },
        "INVALID_BUCKET",
      ],
      [
        "/api/oss/upload-stream",
        {
          method: "POST",
          headers: {
            "content-type": "application/octet-stream",
            "x-oss-bucket": "not-configured",
          },
          body: "x",
        },
        "BUCKET_NOT_CONFIGURED",
      ],
    ]) {
      const response = await json(await request(path, options));
      assert.equal(response.status, 400);
      assert.equal(response.body.error.code, expectedCode);
    }
    const conflict = await json(
      await request("/api/oss/object", {
        method: "DELETE",
        body: JSON.stringify({
          objectKey: "docs/readme.txt",
          bucket: "alpha-bucket",
        }),
        headers: { "x-oss-bucket": "beta-bucket" },
      })
    );
    assert.equal(conflict.status, 400);
    assert.equal(conflict.body.error.code, "BUCKET_CONFLICT");
    assert.equal(ossCalls.length, beforeRejectedRequests);

    const adminList = await json(
      await request(
        "/api/admin/oss/objects",
        {
          headers: { "x-oss-bucket": "beta-bucket" },
        },
        adminToken
      )
    );
    assert.equal(adminList.status, 200);
    assert.equal(adminList.body.bucket, "beta-bucket");
    assert.equal(
      adminList.body.objects[0].url,
      "https://beta-bucket.example/beta-bucket/sample.txt"
    );

    const adminUploadForm = new FormData();
    adminUploadForm.set("bucket", "beta-bucket");
    adminUploadForm.set("objectKey", "admin/manual.txt");
    adminUploadForm.set("file", new Blob(["admin file"]), "manual.txt");
    const adminUpload = await json(
      await request(
        "/api/admin/oss/upload",
        {
          method: "POST",
          body: adminUploadForm,
        },
        adminToken
      )
    );
    assert.equal(adminUpload.status, 201);
    assert.equal(adminUpload.body.objectKey, "admin/manual.txt");
    assert.equal(adminUpload.body.bucket, "beta-bucket");

    const callsBeforeAdminErrors = ossCalls.length;
    const unauthorizedAdmin = await json(
      await request("/api/admin/oss/objects")
    );
    assert.equal(unauthorizedAdmin.status, 401);
    const wrongScope = await json(
      await request("/api/admin/oss/buckets", {}, oldClientToken)
    );
    assert.equal(wrongScope.status, 401);

    replaceAuthClients([]);
    const revokedToken = await json(
      await request("/api/oss/upload-stream", {
        method: "POST",
        headers: { "content-type": "application/octet-stream" },
        body: "revoked",
      })
    );
    assert.equal(revokedToken.status, 401);
    assert.equal(revokedToken.body.error.code, "TOKEN_CLIENT_REVOKED");
    assert.equal(ossCalls.length, callsBeforeAdminErrors);

    assert.deepEqual(
      ossCalls.map(({ operation, bucket, key }) => [operation, bucket, key]),
      [
        ["putStream", "alpha-bucket", "partner-a/file"],
        ["putStream", "beta-bucket", "partner-a/b.txt"],
        ["put", "beta-bucket", "partner-a/uploads/photo.jpg"],
        ["delete", "beta-bucket", "partner-a/docs/readme.txt"],
        ["listV2", "beta-bucket", undefined],
        ["put", "beta-bucket", "admin/manual.txt"],
      ]
    );
  } finally {
    replaceAuthClients([]);
  }
});
