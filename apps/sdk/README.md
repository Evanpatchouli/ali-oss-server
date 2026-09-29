# @ali-oss-server/sdk

Pure Node.js SDK for `ali-oss-server`. Requires Node.js 20 or later.

Install the package:

```bash
npm install @ali-oss-server/sdk
```

## ESM

```js
import { AliOssServerSdk } from "@ali-oss-server/sdk";

const sdk = new AliOssServerSdk({
  serverBaseUrl: "http://localhost:9512",
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
});
```

## CommonJS

```js
const { AliOssServerSdk } = require("@ali-oss-server/sdk");

const sdk = new AliOssServerSdk({
  serverBaseUrl: "http://localhost:9512",
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
});
```

The package root exports `AliOssServerSdk`, `createAliOssServerSdk`, and
`AliOssServerSdkError` for both module systems. TypeScript consumers can import
the SDK and its exported types from the same package root.

## Upload a stream

`uploadStream` accepts a Node.js readable stream. The SDK supports Unicode file
names when paired with a server that understands the UTF-8 filename header:

```js
import { createReadStream } from "node:fs";
import { AliOssServerSdk } from "@ali-oss-server/sdk";

const sdk = new AliOssServerSdk({
  serverBaseUrl: "http://localhost:9512",
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
});

const result = await sdk.uploadStream({
  stream: createReadStream("./照片.png"),
  fileName: "旅行照片.png",
  mimeType: "image/png",
});
console.log(result.objectKey);
```

Pass an `AbortSignal` to cancel a stream upload. The default `controller.abort()`
reason rejects with a `DOMException` named `AbortError`; a custom abort reason is
propagated as-is. The SDK destroys the input readable when an aborted upload
settles. If token refresh is in progress, cancellation rejects this upload
promptly without stopping the shared refresh or sending the upload request.

```js
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30_000);

try {
  await sdk.uploadStream({
    stream: createReadStream("./large-file.bin"),
    fileName: "large-file.bin",
    signal: controller.signal,
  });
} catch (error) {
  if (error instanceof DOMException && error.name === "AbortError") {
    console.log("Upload cancelled");
  } else {
    throw error;
  }
} finally {
  clearTimeout(timeout);
}
```

ASCII names continue to use the `x-file-name` request header. For Unicode
names, the SDK sends `x-file-name-utf8` in the `UTF-8''` plus UTF-8 percent
encoding format. The server decodes that value once, then applies the usual
client object-key isolation rules. Existing servers do not understand this
Unicode header, so upgrade the server before using Unicode file names with the
updated SDK. Requests with ASCII file names remain compatible with older
servers.

## Object keys, URLs, and deletion

For business uploads, the server scopes every object to the SDK client's
`clientId`. You may pass a key relative to that client, such as
`uploads/a.txt`, or the same key with the current client prefix,
`partner-a/uploads/a.txt`. With `clientId: "partner-a"`, both resolve to the
final OSS key `partner-a/uploads/a.txt`; the server manages the prefix. When no
explicit key is supplied, the SDK may derive an upload key from its configured
prefix and filename, but the server still determines the final key.

`uploadBuffer`, `uploadImage`, and `uploadStream` return the final `objectKey`
reported by the server. Save that returned value in your database and pass it
to later SDK operations. Do not reconstruct the final key or prepend
`clientId` again.

```js
import { createReadStream } from "node:fs";
import { AliOssServerSdk } from "@ali-oss-server/sdk";

const sdk = new AliOssServerSdk({
  serverBaseUrl: "http://localhost:9512",
  clientId: "partner-a",
  clientSecret: "replace-with-your-client-secret",
});

const uploaded = await sdk.uploadStream({
  stream: createReadStream("./a.txt"),
  fileName: "a.txt",
  objectKey: "uploads/a.txt",
});

// Persist uploaded.objectKey (and optionally uploaded.url) in your database.
console.log(uploaded.objectKey); // partner-a/uploads/a.txt
await sdk.deleteObject(uploaded.objectKey);
```

The returned `url` is an object address, not a temporary signed URL; it has no
temporary signature or expiration. It remains the same while the object key,
bucket, endpoint, and relevant URL configuration remain the same. URL stability
does not make a private bucket public: direct access depends on the bucket and
object ACL and access policy. A private object requires an authorized access
method. The URL host and exact formatting can vary with OSS configuration.

`deleteObject(objectKey)` accepts either a client-relative key or one already
prefixed with this client's `clientId`. On success, it returns the final
normalized `objectKey` and `deleted: true`. OSS treats deleting a nonexistent
object as success, so you can safely retry when the outcome of a prior request
is unknown as long as the same key has not been uploaded again in the meantime;
a retry after recreation can delete the new object. Repeated deletion in a
versioned bucket can create additional delete markers. Authorization, network,
malformed request, or OSS errors can still reject the call.

See the [API contract](../../docs/specs/api-contracts.md#3-%E4%B8%9A%E5%8A%A1-oss-%E5%AF%B9%E8%B1%A1%E9%9A%94%E7%A6%BB) for the complete behavior and external OSS references.
