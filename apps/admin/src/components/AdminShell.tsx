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
  authClientCount: number;
  children: React.ReactNode;
  errorMessage: string | null;
  globalEnabled: boolean;
  ipStatus: IpAllowlistResponse;
  message: string | null;
  pageLoading: boolean;
  refreshLoading: boolean;
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
    authClientCount,
    children,
    errorMessage,
    globalEnabled,
    ipStatus,
    message,
    pageLoading,
    refreshLoading,
    session,
    tab,
    tabs,
    onDismissError,
    onDismissMessage,
    onLogout,
    onRefresh,
    onTabChange,
  } = props;
  const ipStatusLabel = ipStatus.enabled
    ? `${ipStatus.ips.length} 个 IP`
    : "未启用";
  const globalRateLimitLabel = globalEnabled ? "已启用" : "未启用";

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

          <Paper
            component="section"
            sx={{
              overflow: "hidden",
              px: { xs: 2.5, md: 3.5 },
              py: { xs: 2.75, md: 3.25 },
              borderRadius: "14px",
              background:
                "linear-gradient(135deg, rgba(251,252,254,0.98), rgba(244,247,251,0.94))",
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) auto" },
                gap: { xs: 2.5, md: 3.5 },
                alignItems: "stretch",
              }}
            >
              <Box sx={{ maxWidth: 720 }}>
                <Typography
                  variant="overline"
                  sx={{
                    color: "primary.main",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                  }}
                >
                  运行概览
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    mt: 0.5,
                    lineHeight: 1.12,
                    textWrap: "balance",
                  }}
                >
                  调用方、访问策略与 Bucket 管理
                </Typography>
                <Typography
                  sx={{
                    mt: 1.25,
                    color: "text.secondary",
                    fontSize: 16,
                    lineHeight: 1.7,
                    maxWidth: 640,
                    textWrap: "pretty",
                  }}
                >
                  Client、动态 IP 限制和限流规则会持久化保存；Bucket
                  查询与文件上传会直接访问已配置的 OSS Bucket。
                </Typography>
              </Box>

              <Box
                sx={{
                  minWidth: { lg: 390 },
                  borderLeft: {
                    xs: "none",
                    lg: "1px solid rgba(15, 23, 42, 0.1)",
                  },
                  borderTop: {
                    xs: "1px solid rgba(15, 23, 42, 0.1)",
                    lg: "none",
                  },
                  pl: { xs: 0, lg: 3 },
                  pt: { xs: 2.25, lg: 0 },
                  display: "grid",
                  gridTemplateRows: "1fr auto",
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(3, minmax(0, 1fr))",
                      lg: "repeat(3, max-content)",
                    },
                    gap: { xs: 1.25, sm: 2, lg: 2.5 },
                    alignItems: "start",
                  }}
                >
                  <StatusChip
                    label="Client"
                    value={String(authClientCount)}
                    tone="primary"
                  />
                  <StatusChip
                    label="IP 限制"
                    value={ipStatusLabel}
                    tone={ipStatus.enabled ? "warning" : "neutral"}
                  />
                  <StatusChip
                    label="全局限流"
                    value={globalRateLimitLabel}
                    tone={globalEnabled ? "primary" : "neutral"}
                  />
                </Box>
                <Button
                  variant="outlined"
                  onClick={onRefresh}
                  loading={refreshLoading}
                  disabled={pageLoading}
                  sx={{
                    justifySelf: { xs: "stretch", sm: "end" },
                    minWidth: 108,
                    borderRadius: "999px",
                    fontWeight: 700,
                    transition:
                      "background-color 180ms ease, border-color 180ms ease, transform 180ms ease",
                    "&:hover": {
                      transform: "translateY(-1px)",
                    },
                    "&:active": {
                      transform: "translateY(0)",
                    },
                  }}
                >
                  刷新
                </Button>
              </Box>
            </Box>
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

function StatusChip(props: {
  label: string;
  tone: "neutral" | "primary" | "warning";
  value: string;
}) {
  const { label, tone, value } = props;
  const styles = getStatusChipStyles(tone);

  return (
    <Chip
      variant="outlined"
      label={
        <Box>
          <Typography
            component="span"
            sx={{
              color: styles.labelColor,
              display: "block",
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1.35,
            }}
          >
            {label}
          </Typography>
          <Typography
            component="span"
            sx={{
              color: styles.valueColor,
              display: "block",
              fontSize: 16,
              fontVariantNumeric: "tabular-nums",
              fontWeight: 800,
              lineHeight: 1.25,
              mt: 0.35,
              overflowWrap: "anywhere",
            }}
          >
            {value}
          </Typography>
        </Box>
      }
      sx={{
        alignItems: "center",
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor,
        borderRadius: "12px",
        height: "auto",
        justifyContent: "flex-start",
        minHeight: 58,
        minWidth: { xs: "100%", sm: 118, lg: 112 },
        transition:
          "background-color 180ms ease, border-color 180ms ease, transform 180ms ease",
        "& .MuiChip-label": {
          display: "block",
          px: 1.5,
          py: 1.1,
          whiteSpace: "normal",
        },
        "&:hover": {
          backgroundColor: styles.hoverBackgroundColor,
          transform: "translateY(-1px)",
        },
      }}
    />
  );
}

function getStatusChipStyles(tone: "neutral" | "primary" | "warning") {
  if (tone === "primary") {
    return {
      backgroundColor: "rgba(31, 75, 153, 0.08)",
      borderColor: "rgba(31, 75, 153, 0.24)",
      hoverBackgroundColor: "rgba(31, 75, 153, 0.12)",
      labelColor: "rgba(31, 75, 153, 0.78)",
      valueColor: "#12356f",
    };
  }

  if (tone === "warning") {
    return {
      backgroundColor: "rgba(143, 91, 46, 0.08)",
      borderColor: "rgba(143, 91, 46, 0.24)",
      hoverBackgroundColor: "rgba(143, 91, 46, 0.12)",
      labelColor: "rgba(143, 91, 46, 0.82)",
      valueColor: "#6f3f18",
    };
  }

  return {
    backgroundColor: "rgba(15, 23, 42, 0.04)",
    borderColor: "rgba(15, 23, 42, 0.1)",
    hoverBackgroundColor: "rgba(15, 23, 42, 0.07)",
    labelColor: "rgba(71, 85, 105, 0.92)",
    valueColor: "#0f172a",
  };
}
