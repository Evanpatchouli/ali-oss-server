# @ali-oss-server/sdk

Pure Node.js SDK for `ali-oss-server`.

```ts
import { createReadStream } from "node:fs";
import { AliOssServerSdk } from "@ali-oss-server/sdk";

const sdk = new AliOssServerSdk({
  serverBaseUrl: "http://localhost:9512",
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
});

const uploaded = await sdk.uploadStream({
  stream: createReadStream("avatar.png"),
  fileName: "avatar.png",
  mimeType: "image/png",
});

console.log(uploaded.url);
```
