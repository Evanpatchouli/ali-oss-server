import OSS from "ali-oss";

import { config } from "../config/env.js";
import { badRequest } from "../utils/http-error.js";

const clients = new Map(
  config.oss.buckets.map(({ name, region }) => [
    name,
    new OSS({
      region,
      accessKeyId: config.oss.accessKeyId,
      accessKeySecret: config.oss.accessKeySecret,
      authorizationV4: true,
      bucket: name,
      secure: config.oss.secure,
    }),
  ])
);

export function getOssClient(bucket?: string) {
  const name = bucket ?? config.oss.buckets[0].name;
  const client = clients.get(name);
  if (!client)
    throw badRequest("BUCKET_NOT_CONFIGURED", "bucket is not configured");
  return client;
}

const client = getOssClient();

export default client;
