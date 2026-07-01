import { badRequest } from "../utils/http-error.js";

export type RateLimitRule = {
  windowMs: number;
  maxRequests: number;
};

export type RouteRateLimitRule = RateLimitRule & {
  method: string;
  path: string;
};

export type RateLimitSettings = {
  globalRule: RateLimitRule | null;
  routeRules: RouteRateLimitRule[];
  knownRoutes: Array<{ method: string; path: string }>;
};

type CounterState = {
  windowStartedAt: number;
  count: number;
};

type CounterCheckResult = {
  allowed: boolean;
  retryAfterMs: number;
};

let globalRule: RateLimitRule | null = null;
let routeRuleMap = new Map<string, RouteRateLimitRule>();
const counters = new Map<string, CounterState>();

export const knownRateLimitRoutes: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/health" },
  { method: "POST", path: "/api/auth/token" },
  { method: "POST", path: "/api/oss/upload" },
  { method: "POST", path: "/api/oss/upload-stream" },
  { method: "DELETE", path: "/api/oss/object" },
  { method: "POST", path: "/api/admin/auth/login" },
  { method: "GET", path: "/api/admin/ip-allowlist" },
  { method: "PUT", path: "/api/admin/ip-allowlist" },
  { method: "GET", path: "/api/admin/rate-limit" },
  { method: "PUT", path: "/api/admin/rate-limit" },
];

export function getRateLimitSettings(): RateLimitSettings {
  return {
    globalRule: globalRule ? { ...globalRule } : null,
    routeRules: [...routeRuleMap.values()].sort((left, right) => {
      const methodComparison = left.method.localeCompare(right.method);
      return methodComparison !== 0
        ? methodComparison
        : left.path.localeCompare(right.path);
    }),
    knownRoutes: [...knownRateLimitRoutes],
  };
}

export function replaceRateLimitSettings(input: {
  globalRule: RateLimitRule | null;
  routeRules: RouteRateLimitRule[];
}): RateLimitSettings {
  globalRule = input.globalRule
    ? normalizeRule(input.globalRule, "globalRule")
    : null;

  const nextRouteRules = new Map<string, RouteRateLimitRule>();
  for (const routeRule of input.routeRules) {
    const normalizedRouteRule = normalizeRouteRule(routeRule);
    nextRouteRules.set(
      buildRouteRuleKey(normalizedRouteRule.method, normalizedRouteRule.path),
      normalizedRouteRule
    );
  }

  routeRuleMap = nextRouteRules;
  counters.clear();

  return getRateLimitSettings();
}

export function shouldApplyRateLimit(path: string): boolean {
  return path === "/health" || path.startsWith("/api/");
}

export function checkRateLimit(input: {
  identifier: string;
  method: string;
  path: string;
  now?: number;
}): { allowed: true } | { allowed: false; retryAfterMs: number } {
  const normalizedMethod = normalizeMethod(input.method);
  const now = input.now ?? Date.now();
  const applicableRules: Array<{ scope: string; rule: RateLimitRule }> = [];

  if (globalRule) {
    applicableRules.push({ scope: "global", rule: globalRule });
  }

  const routeRule = routeRuleMap.get(
    buildRouteRuleKey(normalizedMethod, input.path)
  );
  if (routeRule) {
    applicableRules.push({
      scope: `route:${normalizedMethod} ${input.path}`,
      rule: routeRule,
    });
  }

  for (const { scope, rule } of applicableRules) {
    const result = incrementCounter({
      counterKey: `${scope}:${input.identifier}`,
      rule,
      now,
    });

    if (!result.allowed) {
      return result;
    }
  }

  return { allowed: true };
}

function incrementCounter(input: {
  counterKey: string;
  rule: RateLimitRule;
  now: number;
}): CounterCheckResult {
  const windowStartedAt = input.now - (input.now % input.rule.windowMs);
  const currentCounter = counters.get(input.counterKey);
  const counter =
    !currentCounter || currentCounter.windowStartedAt !== windowStartedAt
      ? { windowStartedAt, count: 0 }
      : currentCounter;

  counter.count += 1;
  counters.set(input.counterKey, counter);

  if (counter.count > input.rule.maxRequests) {
    return {
      allowed: false,
      retryAfterMs: Math.max(
        1,
        windowStartedAt + input.rule.windowMs - input.now
      ),
    };
  }

  return {
    allowed: true,
    retryAfterMs: 0,
  };
}

function normalizeRouteRule(routeRule: RouteRateLimitRule): RouteRateLimitRule {
  const method = normalizeMethod(routeRule.method);
  const path = normalizePath(routeRule.path);
  const normalizedRule = normalizeRule(routeRule, `${method} ${path}`);

  return {
    method,
    path,
    windowMs: normalizedRule.windowMs,
    maxRequests: normalizedRule.maxRequests,
  };
}

function normalizeRule(rule: RateLimitRule, label: string): RateLimitRule {
  return {
    windowMs: normalizePositiveInteger(rule.windowMs, `${label}.windowMs`),
    maxRequests: normalizePositiveInteger(
      rule.maxRequests,
      `${label}.maxRequests`
    ),
  };
}

function normalizePositiveInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw badRequest(
      "INVALID_RATE_LIMIT",
      `${fieldName} must be a positive integer`
    );
  }

  return value;
}

function normalizeMethod(method: string): string {
  const normalized = method.trim().toUpperCase();
  if (!/^[A-Z]+$/u.test(normalized)) {
    throw badRequest("INVALID_RATE_LIMIT", "method must contain only letters");
  }

  return normalized;
}

function normalizePath(path: string): string {
  const normalized = path.trim();
  if (!normalized.startsWith("/")) {
    throw badRequest("INVALID_RATE_LIMIT", "path must start with /");
  }

  return normalized;
}

function buildRouteRuleKey(method: string, path: string): string {
  return `${method} ${path}`;
}
