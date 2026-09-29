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

ASCII names continue to use the `x-file-name` request header. For Unicode
names, the SDK sends `x-file-name-utf8` in the `UTF-8''` plus UTF-8 percent
encoding format. The server decodes that value once, then applies the usual
client object-key isolation rules. Existing servers do not understand this
Unicode header, so upgrade the server before using Unicode file names with the
updated SDK. Requests with ASCII file names remain compatible with older
servers.
