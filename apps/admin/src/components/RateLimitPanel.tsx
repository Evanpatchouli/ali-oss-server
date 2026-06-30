import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

import type { EditableRouteRule } from "../types/admin";

type RateLimitPanelProps = {
  globalEnabled: boolean;
  globalMaxRequests: string;
  globalWindowMs: string;
  knownRoutes: Array<{ method: string; path: string }>;
  pageLoading: boolean;
  routePreset: string;
  routeRules: EditableRouteRule[];
  onAddCustomRoute: () => void;
  onAddPresetRoute: () => void;
  onGlobalEnabledChange: (value: boolean) => void;
  onGlobalMaxRequestsChange: (value: string) => void;
  onGlobalWindowMsChange: (value: string) => void;
  onRemoveRouteRule: (id: string) => void;
  onRoutePresetChange: (value: string) => void;
  onRouteRuleChange: (id: string, patch: Partial<EditableRouteRule>) => void;
  onSave: () => void;
};

export function RateLimitPanel(props: RateLimitPanelProps) {
  const {
    globalEnabled,
    globalMaxRequests,
    globalWindowMs,
    knownRoutes,
    pageLoading,
    routePreset,
    routeRules,
    onAddCustomRoute,
    onAddPresetRoute,
    onGlobalEnabledChange,
    onGlobalMaxRequestsChange,
    onGlobalWindowMsChange,
    onRemoveRouteRule,
    onRoutePresetChange,
    onRouteRuleChange,
    onSave,
  } = props;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6">全局限流</Typography>
        <Typography sx={{ mt: 1, color: "text.secondary" }}>
          全局限流和接口级限流可同时存在。任一规则触发都会返回 429。
        </Typography>
      </Box>
      <FormControlLabel
        control={<Switch checked={globalEnabled} onChange={(event) => onGlobalEnabledChange(event.target.checked)} />}
        label="启用全局限流"
      />
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <TextField
          label="窗口时长 (ms)"
          value={globalWindowMs}
          onChange={(event) => onGlobalWindowMsChange(event.target.value)}
          disabled={!globalEnabled}
          fullWidth
        />
        <TextField
          label="窗口内最大请求数"
          value={globalMaxRequests}
          onChange={(event) => onGlobalMaxRequestsChange(event.target.value)}
          disabled={!globalEnabled}
          fullWidth
        />
      </Stack>

      <Divider />

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" } }}
      >
        <Box>
          <Typography variant="h6">接口级限流</Typography>
          <Typography sx={{ mt: 1, color: "text.secondary" }}>
            为特定方法和路径设置单独阈值。可以从预置接口添加，也可以手动编辑。
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <FormControl sx={{ minWidth: 260 }}>
            <InputLabel id="route-preset-label">预置接口</InputLabel>
            <Select
              labelId="route-preset-label"
              value={routePreset}
              label="预置接口"
              onChange={(event) => onRoutePresetChange(event.target.value)}
            >
              {knownRoutes.map((route) => (
                <MenuItem key={`${route.method} ${route.path}`} value={`${route.method} ${route.path}`}>
                  {route.method} {route.path}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={onAddPresetRoute}>
            添加预置
          </Button>
          <Button variant="outlined" onClick={onAddCustomRoute}>
            添加自定义
          </Button>
        </Stack>
      </Stack>

      <Stack spacing={2}>
        {routeRules.length === 0 ? <Alert severity="info">当前没有配置接口级限流。</Alert> : null}
        {routeRules.map((rule, index) => (
          <Paper key={rule.id} sx={{ p: 2.5, backgroundColor: "rgba(255,255,255,0.72)" }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="HTTP 方法"
                  value={rule.method}
                  onChange={(event) => onRouteRuleChange(rule.id, { method: event.target.value.toUpperCase() })}
                  sx={{ minWidth: 140 }}
                />
                <TextField
                  label="路径"
                  value={rule.path}
                  onChange={(event) => onRouteRuleChange(rule.id, { path: event.target.value })}
                  fullWidth
                />
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <TextField
                  label="窗口时长 (ms)"
                  value={rule.windowMs}
                  onChange={(event) => onRouteRuleChange(rule.id, { windowMs: Number(event.target.value) })}
                  fullWidth
                />
                <TextField
                  label="窗口内最大请求数"
                  value={rule.maxRequests}
                  onChange={(event) => onRouteRuleChange(rule.id, { maxRequests: Number(event.target.value) })}
                  fullWidth
                />
              </Stack>
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                <Chip label={`规则 ${index + 1}`} variant="outlined" />
                <Button color="error" onClick={() => onRemoveRouteRule(rule.id)}>
                  删除
                </Button>
              </Stack>
            </Stack>
          </Paper>
        ))}
      </Stack>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" } }}
      >
        <Typography sx={{ color: "text.secondary" }}>当前共配置 {routeRules.length} 条接口级规则。</Typography>
        <Button variant="contained" onClick={onSave} disabled={pageLoading}>
          保存限流配置
        </Button>
      </Stack>
    </Stack>
  );
}
