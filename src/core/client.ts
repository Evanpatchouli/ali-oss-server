import OSS from "ali-oss";

import { config } from "../config/env.js";

const client = new OSS({
  region: config.oss.region,
  accessKeyId: config.oss.accessKeyId,
  accessKeySecret: config.oss.accessKeySecret,
  authorizationV4: true,
  bucket: config.oss.bucket,
  secure: config.oss.secure,
});

export default client;
