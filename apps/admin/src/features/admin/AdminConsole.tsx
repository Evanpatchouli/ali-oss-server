import { useEffect, useMemo, useRef, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  fetchAdminBucketObjects,
  fetchIpAllowlist,
  fetchRateLimit,
  login,
  uploadAdminFile,
  updateIpAllowlist,
  updateRateLimit,
} from "../../api";
import { AdminShell } from "../../components/AdminShell";
import { BucketObjectsPanel } from "../../components/BucketObjectsPanel";
import { FileUploadPanel } from "../../components/FileUploadPanel";
import { IpAllowlistPanel } from "../../components/IpAllowlistPanel";
import { LoginScreen } from "../../components/LoginScreen";
import { RateLimitPanel } from "../../components/RateLimitPanel";
import type {
  AdminUploadResponse,
  BucketObjectsResponse,
  IpAllowlistResponse,
  RateLimitResponse,
} from "../../types/api";
import type { EditableRouteRule, Session } from "../../types/admin";
import {
  clearStoredSession,
  readStoredSession,
  storeSession,
} from "../../utils/session";

const adminTabs = [
  { path: "/ip-allowlist", label: "动态 IP 限制" },
  { path: "/rate-limit", label: "接口限流" },
  { path: "/bucket-objects", label: "Bucket 查询" },
  { path: "/upload", label: "文件上传" },
] as const;

const defaultBucketMaxKeys = "10";

export function AdminConsole() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const lastAutoBucketQueryKey = useRef<string | null>(null);
  const [session, setSession] = useState<Session | null>(() =>
    readStoredSession()
  );
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [ipDraft, setIpDraft] = useState("");
  const [ipStatus, setIpStatus] = useState<IpAllowlistResponse>({
    ips: [],
    enabled: false,
  });
  const [globalEnabled, setGlobalEnabled] = useState(false);
  const [globalWindowMs, setGlobalWindowMs] = useState("60000");
  const [globalMaxRequests, setGlobalMaxRequests] = useState("120");
  const [routeRules, setRouteRules] = useState<EditableRouteRule[]>([]);
  const [knownRoutes, setKnownRoutes] = useState<
    Array<{ method: string; path: string }>
  >([]);
  const [routePreset, setRoutePreset] = useState("");
  const routeBucketPrefix = parseBucketPrefixFromPath(location.pathname);
  const routeBucketMaxKeys =
    searchParams.get("maxKeys") ?? defaultBucketMaxKeys;
  const [bucketPrefix, setBucketPrefix] = useState(routeBucketPrefix);
  const [bucketDelimiter, setBucketDelimiter] = useState("/");
  const [bucketMaxKeys, setBucketMaxKeys] = useState(routeBucketMaxKeys);
  const [bucketListingPending, setBucketListingPending] = useState(false);
  const [bucketObjectsResult, setBucketObjectsResult] =
    useState<BucketObjectsResponse | null>(null);
  const [bucketPageTokens, setBucketPageTokens] = useState<string[]>([""]);
  const [bucketPageIndex, setBucketPageIndex] = useState(0);
  const [uploadDirectory, setUploadDirectory] = useState("");
  const [uploadFilename, setUploadFilename] = useState("");
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(
    null
  );
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadResult, setUploadResult] = useState<AdminUploadResponse | null>(
    null
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    void refreshDashboard(session.token);
  }, [session]);

  useEffect(() => {
    setBucketPrefix(routeBucketPrefix);
    setBucketObjectsResult(null);
    setBucketPageTokens([""]);
    setBucketPageIndex(0);
  }, [routeBucketPrefix]);

  useEffect(() => {
    setBucketMaxKeys(routeBucketMaxKeys);
    setBucketObjectsResult(null);
    setBucketPageTokens([""]);
    setBucketPageIndex(0);
  }, [routeBucketMaxKeys]);

  useEffect(() => {
    if (!session || !isBucketObjectsPath(location.pathname)) {
      return;
    }

    const autoQueryKey = [
      session.token,
      location.pathname,
      routeBucketMaxKeys,
      bucketDelimiter,
    ].join("\n");
    if (lastAutoBucketQueryKey.current === autoQueryKey) {
      return;
    }

    lastAutoBucketQueryKey.current = autoQueryKey;
    void loadBucketObjects({
      continuationToken: undefined,
      delimiter: bucketDelimiter,
      pageIndex: 0,
      prefix: routeBucketPrefix,
      maxKeys: routeBucketMaxKeys,
      resetTokens: true,
    });
  }, [
    bucketDelimiter,
    location.pathname,
    routeBucketMaxKeys,
    routeBucketPrefix,
    session,
  ]);

  const activeIpCount = useMemo(
    () =>
      ipDraft
        .split(/\r?\n/u)
        .map((item) => item.trim())
        .filter(Boolean).length,
    [ipDraft]
  );

  const activeTabIndex = adminTabs.findIndex((item) =>
    item.path === "/bucket-objects"
      ? isBucketObjectsPath(location.pathname)
      : item.path === location.pathname
  );
  const tab = activeTabIndex >= 0 ? activeTabIndex : 0;

  async function refreshDashboard(token: string) {
    setPageLoading(true);
    setErrorMessage(null);

    try {
      const [ipResponse, rateLimitResponse] = await Promise.all([
        fetchIpAllowlist(token),
        fetchRateLimit(token),
      ]);
      applyIpState(ipResponse);
      applyRateLimitState(rateLimitResponse);
    } catch (error) {
      handleRequestError(error);
    } finally {
      setPageLoading(false);
    }
  }

  async function handleLogin() {
    setLoginPending(true);
    setErrorMessage(null);

    try {
      const response = await login(loginUsername.trim(), loginPassword);
      const nextSession = {
        token: response.accessToken,
        username: response.username,
        expiresAt: response.expiresAt,
      };

      storeSession(nextSession);
      setSession(nextSession);
      setMessage("登录成功，已加载管理配置。");
      setLoginPassword("");
    } catch (error) {
      handleRequestError(error);
    } finally {
      setLoginPending(false);
    }
  }

  async function handleSaveIpAllowlist() {
    if (!session) {
      return;
    }

    setPageLoading(true);
    setErrorMessage(null);

    try {
      const ips = ipDraft
        .split(/\r?\n/u)
        .map((item) => item.trim())
        .filter(Boolean);
      const response = await updateIpAllowlist(session.token, ips);
      applyIpState(response);
      setMessage(response.enabled ? "IP 限制已更新。" : "IP 限制已关闭。");
    } catch (error) {
      handleRequestError(error);
    } finally {
      setPageLoading(false);
    }
  }

  async function handleSaveRateLimit() {
    if (!session) {
      return;
    }

    setPageLoading(true);
    setErrorMessage(null);

    try {
      const response = await updateRateLimit(session.token, {
        globalRule: globalEnabled
          ? {
              windowMs: Number.parseInt(globalWindowMs, 10),
              maxRequests: Number.parseInt(globalMaxRequests, 10),
            }
          : null,
        routeRules: routeRules.map(({ id: _id, ...rule }) => ({
          ...rule,
          windowMs: Number.parseInt(String(rule.windowMs), 10),
          maxRequests: Number.parseInt(String(rule.maxRequests), 10),
        })),
      });
      applyRateLimitState(response);
      setMessage("接口限流配置已更新。");
    } catch (error) {
      handleRequestError(error);
    } finally {
      setPageLoading(false);
    }
  }

  async function handleUploadFile() {
    if (!session || !selectedUploadFile) {
      return;
    }

    if (!uploadFilename.trim()) {
      setErrorMessage("请输入目标文件名。");
      return;
    }

    setUploadPending(true);
    setErrorMessage(null);
    setUploadResult(null);

    try {
      const response = await uploadAdminFile(session.token, {
        directory: uploadDirectory,
        filename: uploadFilename,
        file: selectedUploadFile,
      });
      setUploadResult(response);
      setMessage(`文件已上传：${response.objectKey}`);
    } catch (error) {
      handleRequestError(error);
    } finally {
      setUploadPending(false);
    }
  }

  async function handleSearchBucketObjects() {
    const nextLocation = buildBucketObjectsLocation(
      bucketPrefix,
      bucketMaxKeys
    );
    const currentLocation = `${location.pathname}${location.search}`;
    if (nextLocation === currentLocation) {
      lastAutoBucketQueryKey.current = null;
      await loadBucketObjects({
        continuationToken: undefined,
        delimiter: bucketDelimiter,
        pageIndex: 0,
        prefix: bucketPrefix,
        maxKeys: bucketMaxKeys,
        resetTokens: true,
      });
      return;
    }

    navigate(nextLocation);
  }

  async function handleNextBucketObjectsPage() {
    const continuationToken = bucketObjectsResult?.nextContinuationToken;
    if (!continuationToken) {
      return;
    }

    const nextPageIndex = bucketPageIndex + 1;
    setBucketPageTokens((current) => {
      const next = current.slice(0, nextPageIndex);
      next[nextPageIndex] = continuationToken;
      return next;
    });
    await loadBucketObjects({
      continuationToken,
      pageIndex: nextPageIndex,
      prefix: bucketPrefix,
      delimiter: bucketDelimiter,
      maxKeys: bucketMaxKeys,
    });
  }

  async function handlePreviousBucketObjectsPage() {
    if (bucketPageIndex <= 0) {
      return;
    }

    const previousPageIndex = bucketPageIndex - 1;
    await loadBucketObjects({
      continuationToken: bucketPageTokens[previousPageIndex] || undefined,
      pageIndex: previousPageIndex,
      prefix: bucketPrefix,
      delimiter: bucketDelimiter,
      maxKeys: bucketMaxKeys,
    });
  }

  async function handleOpenBucketPrefix(prefix: string) {
    navigateToBucketObjects(prefix, bucketMaxKeys);
  }

  async function loadBucketObjects(input: {
    continuationToken?: string;
    delimiter: string;
    maxKeys: string;
    pageIndex: number;
    prefix: string;
    resetTokens?: boolean;
  }) {
    if (!session) {
      return;
    }

    const normalizedMaxKeys = input.maxKeys.trim();
    if (!/^\d+$/u.test(normalizedMaxKeys)) {
      setErrorMessage("每页数量必须是 1 到 1000 之间的整数。");
      return;
    }

    const maxKeys = Number.parseInt(normalizedMaxKeys, 10);
    if (!Number.isInteger(maxKeys) || maxKeys < 1 || maxKeys > 1000) {
      setErrorMessage("每页数量必须是 1 到 1000 之间的整数。");
      return;
    }

    setBucketListingPending(true);
    setErrorMessage(null);

    try {
      const response = await fetchAdminBucketObjects(session.token, {
        prefix: input.prefix,
        delimiter: input.delimiter,
        maxKeys,
        continuationToken: input.continuationToken,
      });
      setBucketObjectsResult(response);
      setBucketPageIndex(input.pageIndex);
      if (input.resetTokens) {
        setBucketPageTokens([""]);
      }
    } catch (error) {
      handleRequestError(error);
    } finally {
      setBucketListingPending(false);
    }
  }

  function handleUploadFileSelect(file: File) {
    setSelectedUploadFile(file);
    setUploadFilename(file.name);
    setUploadResult(null);
    setErrorMessage(null);
  }

  function handleClearUploadForm() {
    setUploadDirectory("");
    setUploadFilename("");
    setSelectedUploadFile(null);
    setUploadResult(null);
    setErrorMessage(null);
  }

  function handleAddPresetRoute() {
    if (!routePreset) {
      return;
    }

    const [method, ...pathParts] = routePreset.split(" ");
    const path = pathParts.join(" ");
    if (!method || !path) {
      return;
    }

    setRouteRules((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        method,
        path,
        windowMs: 60000,
        maxRequests: 30,
      },
    ]);
    setRoutePreset("");
  }

  function handleAddCustomRoute() {
    setRouteRules((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        method: "GET",
        path: "/api/example",
        windowMs: 60000,
        maxRequests: 30,
      },
    ]);
  }

  function handleRouteRuleChange(
    id: string,
    patch: Partial<EditableRouteRule>
  ) {
    setRouteRules((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function handleRemoveRouteRule(id: string) {
    setRouteRules((current) => current.filter((item) => item.id !== id));
  }

  function handleLogout() {
    clearStoredSession();
    setSession(null);
    setRouteRules([]);
    setKnownRoutes([]);
    setBucketPrefix("");
    setBucketDelimiter("/");
    setBucketMaxKeys(defaultBucketMaxKeys);
    setBucketObjectsResult(null);
    setBucketPageTokens([""]);
    setBucketPageIndex(0);
    setUploadDirectory("");
    setSelectedUploadFile(null);
    setUploadFilename("");
    setUploadResult(null);
    setIpDraft("");
    setIpStatus({ ips: [], enabled: false });
    setMessage("已退出登录。");
  }

  function applyIpState(response: IpAllowlistResponse) {
    setIpStatus(response);
    setIpDraft(response.ips.join("\n"));
  }

  function applyRateLimitState(response: RateLimitResponse) {
    setKnownRoutes(response.knownRoutes);
    setGlobalEnabled(Boolean(response.globalRule));
    setGlobalWindowMs(String(response.globalRule?.windowMs ?? 60000));
    setGlobalMaxRequests(String(response.globalRule?.maxRequests ?? 120));
    setRouteRules(
      response.routeRules.map((rule) => ({
        ...rule,
        id: crypto.randomUUID(),
      }))
    );
  }

  function handleRequestError(error: unknown) {
    const nextMessage = error instanceof Error ? error.message : "请求失败";
    if (/token/i.test(nextMessage) || /401/.test(nextMessage)) {
      clearStoredSession();
      setSession(null);
    }

    setErrorMessage(nextMessage);
  }

  function navigateToBucketObjects(prefix: string, maxKeys: string) {
    navigate(buildBucketObjectsLocation(prefix, maxKeys));
  }

  function updateBucketMaxKeysInUrl(value: string) {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (value.trim()) {
      nextSearchParams.set("maxKeys", value);
    } else {
      nextSearchParams.delete("maxKeys");
    }
    setSearchParams(nextSearchParams, { replace: true });
  }

  if (!session) {
    return (
      <LoginScreen
        errorMessage={errorMessage}
        loginPending={loginPending}
        password={loginPassword}
        username={loginUsername}
        onPasswordChange={setLoginPassword}
        onSubmit={() => void handleLogin()}
        onUsernameChange={setLoginUsername}
      />
    );
  }

  return (
    <AdminShell
      errorMessage={errorMessage}
      globalEnabled={globalEnabled}
      ipStatus={ipStatus}
      message={message}
      pageLoading={pageLoading}
      session={session}
      tab={tab}
      tabs={adminTabs}
      onDismissError={() => setErrorMessage(null)}
      onDismissMessage={() => setMessage(null)}
      onLogout={handleLogout}
      onRefresh={() => void refreshDashboard(session.token)}
      onTabChange={(value) => navigate(adminTabs[value].path)}
    >
      <Routes>
        <Route index element={<Navigate to={adminTabs[0].path} replace />} />
        <Route
          path="ip-allowlist"
          element={
            <IpAllowlistPanel
              activeIpCount={activeIpCount}
              draft={ipDraft}
              pageLoading={pageLoading}
              onChange={setIpDraft}
              onSave={() => void handleSaveIpAllowlist()}
            />
          }
        />
        <Route
          path="rate-limit"
          element={
            <RateLimitPanel
              globalEnabled={globalEnabled}
              globalMaxRequests={globalMaxRequests}
              globalWindowMs={globalWindowMs}
              knownRoutes={knownRoutes}
              pageLoading={pageLoading}
              routePreset={routePreset}
              routeRules={routeRules}
              onAddCustomRoute={handleAddCustomRoute}
              onAddPresetRoute={handleAddPresetRoute}
              onGlobalEnabledChange={setGlobalEnabled}
              onGlobalMaxRequestsChange={setGlobalMaxRequests}
              onGlobalWindowMsChange={setGlobalWindowMs}
              onRemoveRouteRule={handleRemoveRouteRule}
              onRoutePresetChange={setRoutePreset}
              onRouteRuleChange={handleRouteRuleChange}
              onSave={() => void handleSaveRateLimit()}
            />
          }
        />
        <Route
          path="bucket-objects/*"
          element={
            <BucketObjectsPanel
              canGoBack={bucketPageIndex > 0}
              canGoNext={Boolean(bucketObjectsResult?.nextContinuationToken)}
              delimiter={bucketDelimiter}
              listingPending={bucketListingPending}
              maxKeys={bucketMaxKeys}
              pageIndex={bucketPageIndex}
              prefix={bucketPrefix}
              result={bucketObjectsResult}
              onDelimiterChange={(value) => {
                setBucketDelimiter(value);
                setBucketObjectsResult(null);
                setBucketPageTokens([""]);
                setBucketPageIndex(0);
              }}
              onMaxKeysChange={(value) => {
                setBucketMaxKeys(value);
                updateBucketMaxKeysInUrl(value);
                setBucketObjectsResult(null);
                setBucketPageTokens([""]);
                setBucketPageIndex(0);
              }}
              onNextPage={() => void handleNextBucketObjectsPage()}
              onOpenPrefix={(value) => void handleOpenBucketPrefix(value)}
              onPrefixChange={(value) => {
                setBucketPrefix(value);
                setBucketObjectsResult(null);
                setBucketPageTokens([""]);
                setBucketPageIndex(0);
              }}
              onPreviousPage={() => void handlePreviousBucketObjectsPage()}
              onSearch={() => void handleSearchBucketObjects()}
            />
          }
        />
        <Route
          path="upload"
          element={
            <FileUploadPanel
              directory={uploadDirectory}
              filename={uploadFilename}
              selectedFile={selectedUploadFile}
              uploadPending={uploadPending}
              uploadResult={uploadResult}
              onClear={handleClearUploadForm}
              onDirectoryChange={(value) => {
                setUploadDirectory(value);
                setUploadResult(null);
              }}
              onFileSelect={handleUploadFileSelect}
              onFilenameChange={(value) => {
                setUploadFilename(value);
                setUploadResult(null);
              }}
              onUpload={() => void handleUploadFile()}
            />
          }
        />
        <Route path="*" element={<Navigate to={adminTabs[0].path} replace />} />
      </Routes>
    </AdminShell>
  );
}

function isBucketObjectsPath(pathname: string): boolean {
  return (
    pathname === "/bucket-objects" || pathname.startsWith("/bucket-objects/")
  );
}

function parseBucketPrefixFromPath(pathname: string): string {
  if (pathname === "/bucket-objects" || pathname === "/bucket-objects/") {
    return "";
  }

  if (!pathname.startsWith("/bucket-objects/")) {
    return "";
  }

  return decodePathValue(pathname.slice("/bucket-objects/".length));
}

function buildBucketObjectsPath(prefix: string): string {
  if (!prefix) {
    return "/bucket-objects";
  }

  return `/bucket-objects/${encodePathValue(prefix)}`;
}

function buildBucketObjectsLocation(prefix: string, maxKeys: string): string {
  const path = buildBucketObjectsPath(prefix);
  const normalizedMaxKeys = maxKeys.trim();
  return normalizedMaxKeys
    ? `${path}?maxKeys=${encodeURIComponent(normalizedMaxKeys)}`
    : path;
}

function encodePathValue(value: string): string {
  return value.split("/").map(encodeURIComponent).join("/");
}

function decodePathValue(value: string): string {
  try {
    return value.split("/").map(decodeURIComponent).join("/");
  } catch {
    return value;
  }
}
