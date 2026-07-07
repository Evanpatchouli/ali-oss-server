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
  createAuthClient,
  deleteAuthClient,
  fetchAdminBucketObjects,
  fetchAuthClients,
  fetchIpAllowlist,
  fetchRateLimit,
  fetchUploadConfig,
  login,
  uploadAdminFile,
  updateAuthClientSecret,
  updateIpAllowlist,
  updateRateLimit,
} from "../../api";
import { AdminShell } from "../../components/AdminShell";
import { AuthClientsPanel } from "../../components/AuthClientsPanel";
import { BucketObjectsPanel } from "../../components/BucketObjectsPanel";
import { FileUploadPanel } from "../../components/FileUploadPanel";
import { IpAllowlistPanel } from "../../components/IpAllowlistPanel";
import { LoginScreen } from "../../components/LoginScreen";
import { RateLimitPanel } from "../../components/RateLimitPanel";
import { VersionLogPanel } from "../../components/VersionLogPanel";
import type {
  AdminUploadConfig,
  AdminUploadResponse,
  AuthClientsResponse,
  BucketObjectsResponse,
  IpAllowlistResponse,
  RateLimitResponse,
} from "../../types/api";
import type {
  BucketListingTarget,
  EditableRouteRule,
  Session,
} from "../../types/admin";
import {
  clearStoredSession,
  readStoredSession,
  storeSession,
} from "../../utils/session";

const adminTabs = [
  { path: "/ip-allowlist", label: "动态 IP 限制" },
  { path: "/auth-clients", label: "Client 管理" },
  { path: "/rate-limit", label: "接口限流" },
  { path: "/bucket-objects", label: "Bucket 查询" },
  { path: "/upload", label: "文件上传" },
  { path: "/version-log", label: "版本日志" },
] as const;

const defaultBucketMaxKeys = "10";

type PageLoadingTarget =
  | "refresh"
  | "saveIpAllowlist"
  | "addAuthClient"
  | "resetAuthClientSecret"
  | "saveRateLimit"
  | { type: "removeAuthClient"; clientId: string };

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
  const [pageLoadingTarget, setPageLoadingTarget] =
    useState<PageLoadingTarget | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [ipDraft, setIpDraft] = useState("");
  const [ipStatus, setIpStatus] = useState<IpAllowlistResponse>({
    ips: [],
    enabled: false,
  });
  const [authClients, setAuthClients] = useState<
    AuthClientsResponse["clients"]
  >([]);
  const [clientIdDraft, setClientIdDraft] = useState("");
  const [clientSecretDraft, setClientSecretDraft] = useState("");
  const [resetClientId, setResetClientId] = useState<string | null>(null);
  const [resetClientSecretDraft, setResetClientSecretDraft] = useState("");
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
  const [bucketListingTarget, setBucketListingTarget] =
    useState<BucketListingTarget | null>(null);
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
  const [uploadConfig, setUploadConfig] = useState<AdminUploadConfig | null>(
    null
  );
  const nextBucketListingTarget = useRef<BucketListingTarget | null>(null);
  const pageLoading = pageLoadingTarget !== null;

  useEffect(() => {
    if (!session) {
      return;
    }

    void refreshDashboard(session.token);
    void fetchUploadConfig(session.token)
      .then(setUploadConfig)
      .catch(() => setUploadConfig(null));
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
    const loadingTarget = nextBucketListingTarget.current ?? "search";
    nextBucketListingTarget.current = null;
    void loadBucketObjects({
      continuationToken: undefined,
      delimiter: bucketDelimiter,
      loadingTarget,
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
    setPageLoadingTarget("refresh");
    setErrorMessage(null);

    try {
      const [authClientsResponse, ipResponse, rateLimitResponse] =
        await Promise.all([
          fetchAuthClients(token),
          fetchIpAllowlist(token),
          fetchRateLimit(token),
        ]);
      applyAuthClientsState(authClientsResponse);
      applyIpState(ipResponse);
      applyRateLimitState(rateLimitResponse);
    } catch (error) {
      handleRequestError(error);
    } finally {
      setPageLoadingTarget(null);
    }
  }

  async function handleAddAuthClient() {
    if (!session) {
      return;
    }

    const clientId = clientIdDraft.trim();
    const clientSecret = clientSecretDraft.trim();
    if (!clientId || !clientSecret) {
      setErrorMessage("请输入 clientId 和 clientSecret。");
      return;
    }

    setPageLoadingTarget("addAuthClient");
    setErrorMessage(null);

    try {
      const response = await createAuthClient(session.token, {
        clientId,
        clientSecret,
      });
      applyAuthClientsState(response);
      setClientIdDraft("");
      setClientSecretDraft("");
      setMessage(`Client 已新增：${clientId}`);
    } catch (error) {
      handleRequestError(error);
    } finally {
      setPageLoadingTarget(null);
    }
  }

  async function handleResetAuthClientSecret() {
    if (!session || !resetClientId) {
      return;
    }

    const clientSecret = resetClientSecretDraft.trim();
    if (!clientSecret) {
      setErrorMessage("请输入新的 clientSecret。");
      return;
    }

    setPageLoadingTarget("resetAuthClientSecret");
    setErrorMessage(null);

    try {
      const response = await updateAuthClientSecret(
        session.token,
        resetClientId,
        clientSecret
      );
      applyAuthClientsState(response);
      setResetClientId(null);
      setResetClientSecretDraft("");
      setMessage(`Client 密钥已重置：${resetClientId}`);
    } catch (error) {
      handleRequestError(error);
    } finally {
      setPageLoadingTarget(null);
    }
  }

  async function handleRemoveAuthClient(clientId: string) {
    if (!session) {
      return;
    }

    if (!window.confirm(`确认删除 client：${clientId}？`)) {
      return;
    }

    setPageLoadingTarget({ type: "removeAuthClient", clientId });
    setErrorMessage(null);

    try {
      const response = await deleteAuthClient(session.token, clientId);
      applyAuthClientsState(response);
      setMessage(`Client 已删除：${clientId}`);
    } catch (error) {
      handleRequestError(error);
    } finally {
      setPageLoadingTarget(null);
    }
  }

  function handleStartAuthClientReset(clientId: string) {
    setResetClientId(clientId);
    setResetClientSecretDraft("");
    setErrorMessage(null);
  }

  function handleCancelAuthClientReset() {
    setResetClientId(null);
    setResetClientSecretDraft("");
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

    setPageLoadingTarget("saveIpAllowlist");
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
      setPageLoadingTarget(null);
    }
  }

  async function handleSaveRateLimit() {
    if (!session) {
      return;
    }

    setPageLoadingTarget("saveRateLimit");
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
      setPageLoadingTarget(null);
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
        loadingTarget: "search",
        pageIndex: 0,
        prefix: bucketPrefix,
        maxKeys: bucketMaxKeys,
        resetTokens: true,
      });
      return;
    }

    nextBucketListingTarget.current = "search";
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
      loadingTarget: "next",
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
      loadingTarget: "previous",
      pageIndex: previousPageIndex,
      prefix: bucketPrefix,
      delimiter: bucketDelimiter,
      maxKeys: bucketMaxKeys,
    });
  }

  async function handleOpenBucketPrefix(prefix: string) {
    nextBucketListingTarget.current = { type: "prefix", prefix };
    navigateToBucketObjects(prefix, bucketMaxKeys);
  }

  async function loadBucketObjects(input: {
    continuationToken?: string;
    delimiter: string;
    loadingTarget?: BucketListingTarget;
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
    setBucketListingTarget(input.loadingTarget ?? "search");
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
      setBucketListingTarget(null);
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
    setPageLoadingTarget(null);
    setBucketListingTarget(null);
    nextBucketListingTarget.current = null;
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
    setAuthClients([]);
    setClientIdDraft("");
    setClientSecretDraft("");
    setResetClientId(null);
    setResetClientSecretDraft("");
    setMessage("已退出登录。");
  }

  function applyAuthClientsState(response: AuthClientsResponse) {
    const nextClientIds = new Set(
      response.clients.map((client) => client.clientId)
    );

    setAuthClients(response.clients);
    setResetClientId((current) =>
      current && nextClientIds.has(current) ? current : null
    );
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
      authClientCount={authClients.length}
      errorMessage={errorMessage}
      globalEnabled={globalEnabled}
      ipStatus={ipStatus}
      message={message}
      pageLoading={pageLoading}
      refreshLoading={pageLoadingTarget === "refresh"}
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
              saveLoading={pageLoadingTarget === "saveIpAllowlist"}
              onChange={setIpDraft}
              onSave={() => void handleSaveIpAllowlist()}
            />
          }
        />
        <Route
          path="auth-clients"
          element={
            <AuthClientsPanel
              clientIdDraft={clientIdDraft}
              clientSecretDraft={clientSecretDraft}
              clients={authClients}
              addLoading={pageLoadingTarget === "addAuthClient"}
              pageLoading={pageLoading}
              removeLoadingClientId={getRemoveAuthClientId(pageLoadingTarget)}
              resetClientId={resetClientId}
              resetClientSecretDraft={resetClientSecretDraft}
              resetSecretLoading={
                pageLoadingTarget === "resetAuthClientSecret"
              }
              onAdd={() => void handleAddAuthClient()}
              onCancelReset={handleCancelAuthClientReset}
              onClientIdDraftChange={setClientIdDraft}
              onClientSecretDraftChange={setClientSecretDraft}
              onRemove={(clientId) => void handleRemoveAuthClient(clientId)}
              onResetClientSecretDraftChange={setResetClientSecretDraft}
              onSaveReset={() => void handleResetAuthClientSecret()}
              onStartReset={handleStartAuthClientReset}
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
              saveLoading={pageLoadingTarget === "saveRateLimit"}
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
              listingTarget={bucketListingTarget}
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
              maxFileSizeBytes={uploadConfig?.maxFileSizeBytes ?? null}
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
        <Route path="version-log" element={<VersionLogPanel />} />
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

function getRemoveAuthClientId(
  target: PageLoadingTarget | null
): string | null {
  if (typeof target !== "object" || target === null) {
    return null;
  }

  return target.type === "removeAuthClient" ? target.clientId : null;
}
