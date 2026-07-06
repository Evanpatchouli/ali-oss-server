import {
  Box,
  Button,
  Chip,
  FormControlLabel,
  Link,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import type { BucketObjectsResponse } from "../types/api";

type BucketObjectsPanelProps = {
  delimiter: string;
  listingPending: boolean;
  maxKeys: string;
  pageIndex: number;
  prefix: string;
  result: BucketObjectsResponse | null;
  canGoBack: boolean;
  canGoNext: boolean;
  onDelimiterChange: (value: string) => void;
  onMaxKeysChange: (value: string) => void;
  onNextPage: () => void;
  onOpenPrefix: (prefix: string) => void;
  onPrefixChange: (value: string) => void;
  onPreviousPage: () => void;
  onSearch: () => void;
};

export function BucketObjectsPanel(props: BucketObjectsPanelProps) {
  const {
    delimiter,
    listingPending,
    maxKeys,
    pageIndex,
    prefix,
    result,
    canGoBack,
    canGoNext,
    onDelimiterChange,
    onMaxKeysChange,
    onNextPage,
    onOpenPrefix,
    onPrefixChange,
    onPreviousPage,
    onSearch,
  } = props;
  const groupedByDirectory = delimiter === "/";
  const objectCount = result?.objects.length ?? 0;
  const prefixCount = result?.prefixes.length ?? 0;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6">Bucket 查询</Typography>
        <Typography sx={{ mt: 1, color: "text.secondary" }}>
          使用 OSS ListObjectsV2 查询当前配置的 Bucket，仅管理员可访问。
        </Typography>
      </Box>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ alignItems: { xs: "stretch", md: "center" } }}
      >
        <TextField
          label="前缀"
          value={prefix}
          onChange={(event) => onPrefixChange(event.target.value)}
          placeholder="uploads/"
          disabled={listingPending}
          fullWidth
        />
        <TextField
          label="每页数量"
          value={maxKeys}
          onChange={(event) => onMaxKeysChange(event.target.value)}
          disabled={listingPending}
          slotProps={{
            htmlInput: { inputMode: "numeric", min: 1, max: 1000 },
          }}
          sx={{ minWidth: { md: 160 } }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={groupedByDirectory}
              onChange={(event) =>
                onDelimiterChange(event.target.checked ? "/" : "")
              }
              disabled={listingPending}
            />
          }
          label="按目录分组"
          sx={{ minWidth: { md: 150 } }}
        />
        <Button
          variant="contained"
          onClick={onSearch}
          disabled={listingPending}
          sx={{ minWidth: 108 }}
        >
          {listingPending ? "查询中..." : "查询"}
        </Button>
      </Stack>

      {result ? (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Chip label={`Bucket：${result.bucket}`} />
            <Chip label={`第 ${pageIndex + 1} 页`} variant="outlined" />
            <Chip label={`对象 ${objectCount}`} variant="outlined" />
            {groupedByDirectory ? (
              <Chip label={`目录 ${prefixCount}`} variant="outlined" />
            ) : null}
            <Chip
              label={result.isTruncated ? "还有下一页" : "已到末页"}
              color={result.isTruncated ? "primary" : "default"}
              variant={result.isTruncated ? "filled" : "outlined"}
            />
          </Stack>

          <Box sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell>类型</TableCell>
                  <TableCell>对象路径</TableCell>
                  <TableCell align="right">大小</TableCell>
                  <TableCell>最后修改</TableCell>
                  <TableCell>存储类型</TableCell>
                  <TableCell>ETag</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.prefixes.map((item) => (
                  <TableRow key={`prefix:${item}`} hover>
                    <TableCell>
                      <Chip label="目录" size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="text"
                        onClick={() => onOpenPrefix(item)}
                        sx={{
                          justifyContent: "flex-start",
                          maxWidth: 520,
                          overflowWrap: "anywhere",
                          p: 0,
                          textAlign: "left",
                        }}
                      >
                        {item}
                      </Button>
                    </TableCell>
                    <TableCell align="right">-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                  </TableRow>
                ))}
                {result.objects.map((item) => (
                  <TableRow key={`object:${item.objectKey}`} hover>
                    <TableCell>
                      <Chip label="对象" size="small" color="primary" />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 520 }}>
                      <Link
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        sx={{ overflowWrap: "anywhere" }}
                      >
                        {item.objectKey}
                      </Link>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      {formatFileSize(item.size)}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {formatDateTime(item.lastModified)}
                    </TableCell>
                    <TableCell>{item.storageClass ?? "-"}</TableCell>
                    <TableCell sx={{ maxWidth: 180, overflowWrap: "anywhere" }}>
                      {item.etag ?? "-"}
                    </TableCell>
                  </TableRow>
                ))}
                {objectCount === 0 && prefixCount === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      当前条件下没有对象。
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{
              alignItems: { xs: "stretch", sm: "center" },
              justifyContent: "space-between",
            }}
          >
            <Typography sx={{ color: "text.secondary" }}>
              KeyCount：{result.keyCount ?? objectCount + prefixCount}
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                onClick={onPreviousPage}
                disabled={listingPending || !canGoBack}
              >
                上一页
              </Button>
              <Button
                variant="outlined"
                onClick={onNextPage}
                disabled={listingPending || !canGoNext}
              >
                下一页
              </Button>
            </Stack>
          </Stack>
        </Stack>
      ) : (
        <Typography sx={{ color: "text.secondary" }}>
          输入前缀后点击查询；前缀为空时从 Bucket 根路径开始查询。
        </Typography>
      )}
    </Stack>
  );
}

function formatFileSize(size: number | null): string {
  if (size === null) {
    return "-";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Date(timestamp).toLocaleString();
}
