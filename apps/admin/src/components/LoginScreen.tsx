import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from "@mui/material";

type LoginScreenProps = {
  errorMessage: string | null;
  loginPending: boolean;
  password: string;
  username: string;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onUsernameChange: (value: string) => void;
};

export function LoginScreen(props: LoginScreenProps) {
  const { errorMessage, loginPending, password, username, onPasswordChange, onSubmit, onUsernameChange } = props;

  return (
    <Container maxWidth="sm" sx={{ minHeight: "100vh", display: "grid", alignItems: "center", py: 6 }}>
      <Paper sx={{ p: { xs: 3, sm: 4 }, backdropFilter: "blur(8px)" }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: "0.16em" }}>
              Ali OSS Admin
            </Typography>
            <Typography variant="h4" sx={{ mt: 1 }}>
              登录管理端
            </Typography>
            <Typography sx={{ mt: 1, color: "text.secondary" }}>
              使用 `.env` 中配置的管理员账号密码登录，管理动态 IP 限制和接口限流。
            </Typography>
          </Box>
          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
          <TextField
            label="管理员账号"
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            autoComplete="username"
          />
          <TextField
            label="管理员密码"
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            autoComplete="current-password"
          />
          <Button variant="contained" size="large" onClick={onSubmit} disabled={loginPending}>
            {loginPending ? "登录中..." : "登录"}
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
