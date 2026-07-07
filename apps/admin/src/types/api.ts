export type AdminLoginResponse = {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  expiresAt: string;
  username: string;
};

export type IpAllowlistResponse = {
  ips: string[];
  enabled: boolean;
};

export type RateLimitRule = {
  windowMs: number;
  maxRequests: number;
};

export type RouteRateLimitRule = RateLimitRule & {
  method: string;
  path: string;
};

export type RateLimitResponse = {
  globalRule: RateLimitRule | null;
  routeRules: RouteRateLimitRule[];
  knownRoutes: Array<{ method: string; path: string }>;
};

export type BucketObjectSummary = {
  objectKey: string;
  url: string;
  size: number | null;
  lastModified: string | null;
  etag: string | null;
  storageClass: string | null;
};

export type BucketObjectsResponse = {
  bucket: string;
  prefix: string;
  delimiter: string;
  maxKeys: number;
  keyCount: number | null;
  isTruncated: boolean;
  nextContinuationToken: string | null;
  objects: BucketObjectSummary[];
  prefixes: string[];
};

export type AdminUploadResponse = {
  objectKey: string;
  url: string;
  bucket: string;
};

export type AdminUploadConfig = {
  maxFileSizeBytes: number;
};
