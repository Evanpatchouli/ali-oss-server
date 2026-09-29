import assert from "node:assert/strict";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import test from "node:test";
import { AliOssServerSdk, AliOssServerSdkError } from "../dist/index.js";

const validToken = () =>
  new Response(
    JSON.stringify({
      tokenType: "Bearer",
      accessToken: "test-token",
      expiresIn: 3600,
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      clientId: "client",
    })
  );

function sdkWith(fetch) {
  return new AliOssServerSdk({
    serverBaseUrl: "http://localhost:9512",
    clientId: "client",
    clientSecret: "secret",
    fetch,
  });
}

function uploadInput(options = {}) {
  return { stream: Readable.from(["payload"]), ...options };
}

function waitWithin(promise, message, timeoutMs = 5000) {
  let timeout;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timeout));
}

test("pre-aborted upload rejects before requesting a token", async () => {
  const reason = new DOMException("This operation was aborted", "AbortError");
  const controller = new AbortController();
  controller.abort(reason);
  const requests = [];
  const input = uploadInput({ signal: controller.signal });
  const sdk = sdkWith(async (url) => {
    requests.push(url);
    return validToken();
  });

  await assert.rejects(sdk.uploadStream(input), (error) => error === reason);
  assert.deepEqual(requests, []);
  assert.equal(input.stream.destroyed, true);
});

test("aborting while token refresh is pending rejects promptly without uploading", async () => {
  let resolveToken;
  const tokenResponse = new Promise((resolve) => {
    resolveToken = resolve;
  });
  const requests = [];
  const sdk = sdkWith(async (url) => {
    requests.push(url);
    return tokenResponse;
  });
  const controller = new AbortController();
  const reason = new Error("cancel this upload");
  const input = uploadInput({ signal: controller.signal });
  const upload = sdk.uploadStream(input);

  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(requests, ["http://localhost:9512/api/auth/token"]);
  const otherCaller = sdk.getAccessToken();
  controller.abort(reason);
  await assert.rejects(
    waitWithin(upload, "cancelled upload waited for token refresh"),
    (error) => error === reason
  );
  assert.equal(input.stream.destroyed, true);
  resolveToken(validToken());
  assert.equal(await otherCaller, "test-token");
  assert.deepEqual(requests, ["http://localhost:9512/api/auth/token"]);
});

test("abort reason wins if the shared token refresh fails", async () => {
  let rejectToken;
  const tokenResponse = new Promise((_, reject) => {
    rejectToken = reject;
  });
  const requests = [];
  const sdk = sdkWith(async (url) => {
    requests.push(url);
    return tokenResponse;
  });
  const controller = new AbortController();
  const reason = new Error("cancel this upload");
  const tokenError = new Error("token service unavailable");
  const input = uploadInput({ signal: controller.signal });
  const upload = sdk.uploadStream(input);
  const otherCaller = sdk.getAccessToken();

  controller.abort(reason);
  await assert.rejects(upload, (error) => error === reason);
  rejectToken(tokenError);
  await assert.rejects(otherCaller, (error) => error === tokenError);
  assert.deepEqual(requests, ["http://localhost:9512/api/auth/token"]);
  assert.equal(input.stream.destroyed, true);
});

test("upload without a signal remains successful", async () => {
  let uploadInit;
  const sdk = sdkWith(async (url, init) => {
    if (url.endsWith("/api/auth/token")) return validToken();
    uploadInit = init;
    return new Response(
      JSON.stringify({
        objectKey: "client/file.txt",
        url: "https://example.test/file.txt",
        bucket: "test-bucket",
      })
    );
  });

  const result = await sdk.uploadStream(uploadInput());
  assert.equal(result.objectKey, "client/file.txt");
  assert.equal(uploadInit.signal, undefined);
});

test("HTTP errors remain AliOssServerSdkError values", async () => {
  const sdk = sdkWith(async (url) =>
    url.endsWith("/api/auth/token")
      ? validToken()
      : new Response(
          JSON.stringify({
            message: "Upload rejected",
            error: { code: "TOO_LARGE" },
          }),
          {
            status: 413,
            statusText: "Payload Too Large",
          }
        )
  );

  await assert.rejects(
    sdk.uploadStream(uploadInput()),
    (error) =>
      error instanceof AliOssServerSdkError &&
      error.status === 413 &&
      error.code === "TOO_LARGE" &&
      error.message === "Upload rejected"
  );
});

test(
  "native fetch aborts an in-flight stream upload",
  { timeout: 10000 },
  async (t) => {
    let notifyRequest;
    const requestStarted = new Promise((resolve) => {
      notifyRequest = resolve;
    });
    let notifyAborted;
    const requestAborted = new Promise((resolve) => {
      notifyAborted = resolve;
    });
    const server = createServer((request, response) => {
      if (request.url === "/api/auth/token") {
        request.resume();
        request.on("end", () => {
          response.writeHead(200, { "Content-Type": "application/json" });
          response.end(
            JSON.stringify({
              tokenType: "Bearer",
              accessToken: "test-token",
              expiresIn: 3600,
              expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
              clientId: "client",
            })
          );
        });
        return;
      }

      notifyRequest();
      request.on("data", () => {});
      request.on("aborted", notifyAborted);
      request.on("error", () => {});
      response.on("error", () => {});
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const address = server.address();
    assert.ok(address && typeof address === "object");

    const controller = new AbortController();
    let pendingChunk = false;
    const stream = new Readable({
      read() {
        if (pendingChunk) return;
        pendingChunk = true;
        setTimeout(() => {
          pendingChunk = false;
          this.push(Buffer.alloc(64 * 1024, 0x61));
        }, 5);
      },
    });
    const sdk = new AliOssServerSdk({
      serverBaseUrl: `http://127.0.0.1:${address.port}`,
      clientId: "client",
      clientSecret: "secret",
    });
    const upload = sdk.uploadStream({ stream, signal: controller.signal });

    await waitWithin(requestStarted, "native upload request did not start");
    controller.abort();
    await assert.rejects(upload, { name: "AbortError" });
    await waitWithin(requestAborted, "server did not observe request abort");
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(stream.destroyed, true);
  }
);
