import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import excelIconSvg from "../assets/excel.svg?raw";
import fileIconSvg from "../assets/file.svg?raw";
import wordIconSvg from "../assets/word.svg?raw";
import zipIconSvg from "../assets/zip.svg?raw";
import type { AdminUploadResponse } from "../types/api";

type FileUploadPanelProps = {
  directory: string;
  filename: string;
  maxFileSizeBytes: number | null;
  selectedFile: File | null;
  uploadPending: boolean;
  uploadResult: AdminUploadResponse | null;
  onDirectoryChange: (value: string) => void;
  onFilenameChange: (value: string) => void;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  onUpload: () => void;
};

export function FileUploadPanel(props: FileUploadPanelProps) {
  const {
    directory,
    filename,
    maxFileSizeBytes,
    selectedFile,
    uploadPending,
    uploadResult,
    onDirectoryChange,
    onFilenameChange,
    onFileSelect,
    onClear,
    onUpload,
  } = props;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const imagePreviewUrl = useImagePreviewUrl(selectedFile);
  const fileOversized =
    maxFileSizeBytes != null &&
    selectedFile != null &&
    selectedFile.size > maxFileSizeBytes;

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files.item(0);
    if (file) {
      onFileSelect(file);
    }
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6">上传文件</Typography>
        <Typography sx={{ mt: 1, color: "text.secondary" }}>
          此入口仅管理员可用。目录和目标文件名会组合成 OSS
          对象路径，目录为空时直接上传到 Bucket 根路径。
          {maxFileSizeBytes != null
            ? `最大上传大小：${formatFileSize(maxFileSizeBytes)}。`
            : null}
        </Typography>
      </Box>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <TextField
          label="上传目录"
          value={directory}
          onChange={(event) => onDirectoryChange(event.target.value)}
          placeholder="uploads"
          disabled={uploadPending}
          fullWidth
        />
        <TextField
          label="目标文件名"
          value={filename}
          onChange={(event) => onFilenameChange(event.target.value)}
          placeholder={selectedFile?.name ?? "file.png"}
          disabled={uploadPending}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      onFilenameChange(
                        buildRandomFilename(filename || selectedFile?.name)
                      )
                    }
                    disabled={uploadPending}
                  >
                    随机
                  </Button>
                </InputAdornment>
              ),
            },
          }}
          fullWidth
        />
      </Stack>

      <Box
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        sx={{
          border: "1px dashed rgba(15, 23, 42, 0.3)",
          borderRadius: 2,
          cursor: "pointer",
          p: { xs: 3, md: 4 },
          textAlign: "center",
          transition: "border-color 160ms ease, background-color 160ms ease",
          "&:hover": {
            borderColor: "primary.main",
            backgroundColor: "rgba(25, 118, 210, 0.04)",
          },
        }}
      >
        <input
          ref={inputRef}
          type="file"
          hidden
          onChange={(event) => {
            const file = event.target.files?.item(0);
            if (file) {
              onFileSelect(file);
            }
            event.target.value = "";
          }}
        />
        <Stack spacing={1.5} sx={{ alignItems: "center" }}>
          <Typography variant="h6">
            {selectedFile ? selectedFile.name : "点击或拖拽文件到这里"}
          </Typography>
          {selectedFile ? (
            <Stack spacing={1.5} sx={{ alignItems: "center" }}>
              {imagePreviewUrl ? (
                <Box
                  component="img"
                  src={imagePreviewUrl}
                  alt={selectedFile.name}
                  sx={{
                    borderRadius: 1,
                    maxHeight: 220,
                    maxWidth: "min(100%, 520px)",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <FileTypeIcon file={selectedFile} />
              )}
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                <Chip
                  color={fileOversized ? "error" : undefined}
                  label={`${formatFileSize(selectedFile.size)}`}
                />
                <Chip
                  label={selectedFile.type || "未知类型"}
                  variant="outlined"
                />
              </Stack>

              {fileOversized ? (
                <Alert severity="error" sx={{ mt: 1.5 }}>
                  文件大小超出限制（上限 {formatFileSize(maxFileSizeBytes!)}
                  ，当前文件 {formatFileSize(selectedFile.size)}）。
                </Alert>
              ) : null}
            </Stack>
          ) : (
            <Typography sx={{ color: "text.secondary" }}>
              仅会读取第一个文件。
            </Typography>
          )}
        </Stack>
      </Box>

      {uploadResult ? (
        <Alert severity="success">
          已上传到 {uploadResult.bucket} / {uploadResult.objectKey}，
          <Link href={uploadResult.url} target="_blank" rel="noreferrer">
            打开文件
          </Link>
        </Alert>
      ) : null}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
        }}
      >
        <Typography sx={{ color: "text.secondary" }}>
          对象路径预览：{buildPreviewObjectKey(directory, filename)}
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            onClick={onClear}
            disabled={
              uploadPending || (!directory && !filename && !selectedFile)
            }
          >
            清空
          </Button>
          <Button
            variant="contained"
            onClick={onUpload}
            loading={uploadPending}
            disabled={
              uploadPending ||
              !filename.trim() ||
              !selectedFile ||
              fileOversized
            }
          >
            上传文件
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}

function buildPreviewObjectKey(directory: string, filename: string): string {
  const objectKey = [directory, filename]
    .flatMap((part) => part.trim().replaceAll("\\", "/").split("/"))
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");

  return objectKey ? `/${objectKey}` : "-";
}

function buildRandomFilename(sourceFilename?: string): string {
  return `${crypto.randomUUID()}${getFilenameExtension(sourceFilename)}`;
}

function getFilenameExtension(filename?: string): string {
  const normalized = filename?.trim().replaceAll("\\", "/") ?? "";
  const name = normalized.split("/").filter(Boolean).at(-1) ?? "";
  const lastDotIndex = name.lastIndexOf(".");

  if (lastDotIndex <= 0 || lastDotIndex === name.length - 1) {
    return "";
  }

  return name.slice(lastDotIndex);
}

function useImagePreviewUrl(file: File | null): string | null {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isImage = useMemo(() => (file ? isImageFile(file) : false), [file]);

  useEffect(() => {
    if (!file || !isImage) {
      setPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [file, isImage]);

  return previewUrl;
}

function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) {
    return true;
  }

  return /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/iu.test(file.name);
}

function FileTypeIcon(props: { file: File }) {
  const extension = getDisplayExtension(props.file.name);
  const kind = getFileIconKind(extension);
  const iconSvg =
    kind === "excel"
      ? excelIconSvg
      : kind === "word"
        ? wordIconSvg
        : kind === "archive"
          ? zipIconSvg
          : fileIconSvg;
  const showExtensionBadge = kind === "archive" || kind === "text";

  return (
    <Box
      aria-label={`${extension} 文件`}
      sx={{
        height: 64,
        position: "relative",
        width: 64,
        "& svg": {
          display: "block",
          height: 64,
          width: 64,
        },
      }}
    >
      <Box dangerouslySetInnerHTML={{ __html: iconSvg }} />
      {showExtensionBadge ? <FileExtensionBadge extension={extension} /> : null}
    </Box>
  );
}

function FileExtensionBadge(props: { extension: string }) {
  return (
    <Box
      sx={{
        alignItems: "center",
        backgroundColor: "#0f7bff",
        border: "2px solid #fff",
        borderRadius: 1,
        outline: "2px solid #0f7bff",
        color: "#fff",
        display: "flex",
        fontSize: 12,
        fontWeight: 700,
        height: 16,
        justifyContent: "center",
        bottom: 10,
        letterSpacing: 0,
        lineHeight: 1,
        px: 1,
        position: "absolute",
        right: -6,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        width: "fit-content",
      }}
    >
      {props.extension}
    </Box>
  );
}

function getDisplayExtension(filename: string): string {
  return getFilenameExtension(filename).replace(/^\./u, "") || "file";
}

function getFileIconKind(
  extension: string
): "archive" | "excel" | "word" | "text" {
  const normalized = extension.toLowerCase();
  if (["csv", "xls", "xlsm", "xlsx"].includes(normalized)) {
    return "excel";
  }

  if (["doc", "docx", "dot", "dotx"].includes(normalized)) {
    return "word";
  }

  if (
    [
      "7z",
      "7zip",
      "bz2",
      "gz",
      "gzip",
      "rar",
      "tar",
      "tgz",
      "xz",
      "zip",
    ].includes(normalized)
  ) {
    return "archive";
  }

  return "text";
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
