import { Box, Button, Stack, TextField, Typography } from "@mui/material";

type IpAllowlistPanelProps = {
  activeIpCount: number;
  draft: string;
  pageLoading: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
};

export function IpAllowlistPanel(props: IpAllowlistPanelProps) {
  const { activeIpCount, draft, pageLoading, onChange, onSave } = props;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6">允许访问的 IP 列表</Typography>
        <Typography sx={{ mt: 1, color: "text.secondary" }}>
          每行一个 IPv4 或 IPv6。列表为空时，不限制访问 IP。
        </Typography>
      </Box>
      <TextField
        label="允许访问的 IP"
        multiline
        minRows={8}
        value={draft}
        onChange={(event) => onChange(event.target.value)}
        placeholder={"127.0.0.1\n::1"}
      />
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
        }}
      >
        <Typography sx={{ color: "text.secondary" }}>
          当前草稿包含 {activeIpCount} 个 IP。
        </Typography>
        <Button variant="contained" onClick={onSave} disabled={pageLoading}>
          保存 IP 限制
        </Button>
      </Stack>
    </Stack>
  );
}
