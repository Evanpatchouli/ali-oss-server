import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from "@mui/material";

import type { IpAllowlistResponse } from "../types/api";
import type { Session } from "../types/admin";

type AdminShellProps = {
  children: React.ReactNode;
  errorMessage: string | null;
  globalEnabled: boolean;
  ipStatus: IpAllowlistResponse;
  message: string | null;
  pageLoading: boolean;
  session: Session;
  tab: number;
  tabs: ReadonlyArray<{ label: string; path: string }>;
  onDismissError: () => void;
  onDismissMessage: () => void;
  onLogout: () => void;
  onRefresh: () => void;
  onTabChange: (value: number) => void;
};

export function AdminShell(props: AdminShellProps) {
  const versionLabel = `v${__APP_VERSION__.version}${
    __GIT_SHA__ === "unknown" ? "" : ` (${__GIT_SHA__})`
  }`;
  const {
    children,
    errorMessage,
    globalEnabled,
    ipStatus,
    message,
    pageLoading,
    session,
    tab,
    tabs,
    onDismissError,
    onDismissMessage,
    onLogout,
    onRefresh,
    onTabChange,
  } = props;

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
        }}
      >
        <Toolbar sx={{ gap: 2, flexWrap: "wrap", py: 1 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography
              variant="overline"
              sx={{ color: "primary.main", letterSpacing: "0.16em" }}
            >
              管理端
            </Typography>
            <Typography variant="h6">Ali OSS ADMIN</Typography>
          </Box>
          <Chip
            label={`管理员：${session.username}`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`到期：${new Date(session.expiresAt).toLocaleString()}`}
            variant="outlined"
          />
          <Chip
            label={versionLabel}
            title={`${__APP_NAME__} build ${__APP_VERSION__.buildTime}`}
            variant="outlined"
          />
          <Button onClick={onLogout}>退出</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          {message ? (
            <Alert severity="success" onClose={onDismissMessage}>
              {message}
            </Alert>
          ) : null}
          {errorMessage ? (
            <Alert severity="error" onClose={onDismissError}>
              {errorMessage}
            </Alert>
          ) : null}

          <Paper sx={{ p: { xs: 2.5, md: 3.5 } }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              sx={{
                justifyContent: "space-between",
                alignItems: { xs: "flex-start", md: "center" },
              }}
            >
              <Box>
                <Typography variant="h4">
                  访问策略、接口节流与 Bucket 管理
                </Typography>
                <Typography
                  sx={{ mt: 1, color: "text.secondary", maxWidth: 720 }}
                >
                  动态 IP 限制和限流规则会持久化保存；Bucket
                  查询与文件上传会直接访问已配置的 OSS Bucket。
                </Typography>
              </Box>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
                <Chip
                  label={
                    ipStatus.enabled
                      ? `IP 限制已启用 (${ipStatus.ips.length})`
                      : "IP 限制未启用"
                  }
                  color={ipStatus.enabled ? "secondary" : "default"}
                />
                <Chip
                  label={globalEnabled ? "全局限流已启用" : "全局限流未启用"}
                  color={globalEnabled ? "primary" : "default"}
                />
                <Button
                  variant="outlined"
                  onClick={onRefresh}
                  disabled={pageLoading}
                >
                  {pageLoading ? "刷新中..." : "刷新"}
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <Paper sx={{ overflow: "hidden" }}>
            <Tabs
              value={tab}
              onChange={(_event, nextValue) => onTabChange(nextValue)}
              variant="fullWidth"
            >
              {tabs.map((item) => (
                <Tab key={item.path} label={item.label} />
              ))}
            </Tabs>

            <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>{children}</Box>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
