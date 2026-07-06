import { useEffect, useMemo, useState } from "react";

import {
  fetchIpAllowlist,
  fetchRateLimit,
  login,
  uploadAdminFile,
  updateIpAllowlist,
  updateRateLimit,
} from "../../api";
import { AdminShell } from "../../components/AdminShell";
import { FileUploadPanel } from "../../components/FileUploadPanel";
import { IpAllowlistPanel } from "../../components/IpAllowlistPanel";
import { LoginScreen } from "../../components/LoginScreen";
import { RateLimitPanel } from "../../components/RateLimitPanel";
import type {
  AdminUploadResponse,
  IpAllowlistResponse,
  RateLimitResponse,
} from "../../types/api";
import type { EditableRouteRule, Session } from "../../types/admin";
import {
  clearStoredSession,
  readStoredSession,
  storeSession,
} from "../../utils/session";

export function AdminConsole() {
  const [session, setSession] = useState<Session | null>(() =>
    readStoredSession()
  );
  const [tab, setTab] = useState(0);
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

  const activeIpCount = useMemo(
    () =>
      ipDraft
        .split(/\r?\n/u)
        .map((item) => item.trim())
        .filter(Boolean).length,
    [ipDraft]
  );

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
      onDismissError={() => setErrorMessage(null)}
      onDismissMessage={() => setMessage(null)}
      onLogout={handleLogout}
      onRefresh={() => void refreshDashboard(session.token)}
      onTabChange={setTab}
    >
      {tab === 0 ? (
        <IpAllowlistPanel
          activeIpCount={activeIpCount}
          draft={ipDraft}
          pageLoading={pageLoading}
          onChange={setIpDraft}
          onSave={() => void handleSaveIpAllowlist()}
        />
      ) : tab === 1 ? (
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
      ) : (
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
      )}
    </AdminShell>
  );
}
