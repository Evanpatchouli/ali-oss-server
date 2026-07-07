import { Fragment } from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import type { AuthClientSummary } from "../types/api";

type AuthClientsPanelProps = {
  clients: AuthClientSummary[];
  addLoading: boolean;
  clientIdDraft: string;
  clientSecretDraft: string;
  pageLoading: boolean;
  removeLoadingClientId: string | null;
  resetClientId: string | null;
  resetClientSecretDraft: string;
  resetSecretLoading: boolean;
  onAdd: () => void;
  onCancelReset: () => void;
  onClientIdDraftChange: (value: string) => void;
  onClientSecretDraftChange: (value: string) => void;
  onRemove: (clientId: string) => void;
  onResetClientSecretDraftChange: (value: string) => void;
  onSaveReset: () => void;
  onStartReset: (clientId: string) => void;
};

export function AuthClientsPanel(props: AuthClientsPanelProps) {
  const {
    clients,
    addLoading,
    clientIdDraft,
    clientSecretDraft,
    pageLoading,
    removeLoadingClientId,
    resetClientId,
    resetClientSecretDraft,
    resetSecretLoading,
    onAdd,
    onCancelReset,
    onClientIdDraftChange,
    onClientSecretDraftChange,
    onRemove,
    onResetClientSecretDraftChange,
    onSaveReset,
    onStartReset,
  } = props;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6">调用方 Client</Typography>
        <Typography sx={{ mt: 1, color: "text.secondary" }}>
          管理用于换取业务 Bearer Token 的 clientId/clientSecret。
          密钥不会在列表中回显；新增或重置后请同步给调用方。
        </Typography>
      </Box>

      <Alert severity="info">
        Client 只通过管理端维护。首次启动列表可以为空，新增后会写入运行态状态文件并立即生效。
      </Alert>

      <Stack spacing={2}>
        <Typography variant="h6">新增 Client</Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="clientId"
            value={clientIdDraft}
            onChange={(event) => onClientIdDraftChange(event.target.value)}
            fullWidth
          />
          <TextField
            label="clientSecret"
            type="password"
            value={clientSecretDraft}
            onChange={(event) => onClientSecretDraftChange(event.target.value)}
            fullWidth
          />
          <Button
            variant="contained"
            onClick={onAdd}
            loading={addLoading}
            disabled={pageLoading}
            sx={{ minWidth: 132 }}
          >
            新增 client
          </Button>
        </Stack>
      </Stack>

      <Divider />

      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
          }}
        >
          <Box>
            <Typography variant="h6">已配置 Client</Typography>
            <Typography sx={{ mt: 1, color: "text.secondary" }}>
              当前共 {clients.length} 个 client。删除或重置会影响后续 token 校验和新 token 签发。
            </Typography>
          </Box>
        </Stack>

        {clients.length === 0 ? (
          <Alert severity="warning">当前没有可用 client。</Alert>
        ) : (
          <TableContainer
            component={Paper}
            sx={{ backgroundColor: "rgba(255,255,255,0.72)" }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>clientId</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clients.map((client) => {
                  const isResetting = resetClientId === client.clientId;

                  return (
                    <Fragment key={client.clientId}>
                      <TableRow>
                        <TableCell sx={{ wordBreak: "break-all" }}>
                          {client.clientId}
                        </TableCell>
                        <TableCell align="right">
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            sx={{ justifyContent: "flex-end" }}
                          >
                            <Button
                              variant="outlined"
                              onClick={() => onStartReset(client.clientId)}
                              disabled={pageLoading}
                            >
                              重置密钥
                            </Button>
                            <Button
                              color="error"
                              onClick={() => onRemove(client.clientId)}
                              loading={removeLoadingClientId === client.clientId}
                              disabled={pageLoading}
                            >
                              删除
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                      {isResetting ? (
                        <TableRow>
                          <TableCell colSpan={2}>
                            <Stack
                              direction={{ xs: "column", md: "row" }}
                              spacing={2}
                              sx={{ py: 1.5 }}
                            >
                              <TextField
                                label="新的 clientSecret"
                                type="password"
                                value={resetClientSecretDraft}
                                onChange={(event) =>
                                  onResetClientSecretDraftChange(
                                    event.target.value
                                  )
                                }
                                fullWidth
                              />
                              <Button
                                variant="contained"
                                onClick={onSaveReset}
                                loading={resetSecretLoading}
                                disabled={pageLoading}
                                sx={{ minWidth: 120 }}
                              >
                                保存新密钥
                              </Button>
                              <Button onClick={onCancelReset}>取消</Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
    </Stack>
  );
}
