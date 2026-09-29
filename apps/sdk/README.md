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
