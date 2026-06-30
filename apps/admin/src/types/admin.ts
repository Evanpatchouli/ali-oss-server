import type { RouteRateLimitRule } from "./api";

export type Session = {
  token: string;
  username: string;
  expiresAt: string;
};

export type EditableRouteRule = RouteRateLimitRule & {
  id: string;
};
