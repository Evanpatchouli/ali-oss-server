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

export type AdminUploadResponse = {
  objectKey: string;
  url: string;
  bucket: string;
};
