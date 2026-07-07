import {
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";

const versionItems = [
  { label: "当前版本", value: `v${__APP_VERSION__.version}` },
  { label: "Git Hash", value: __APP_VERSION__.gitHash },
  { label: "发行时间", value: formatBuildTime(__APP_VERSION__.buildTime) },
  { label: "应用名称", value: __APP_NAME__ },
] as const;

const changelogEntries = parseChangelog(__APP_CHANGELOG__);

export function VersionLogPanel() {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6">版本日志</Typography>
        <Typography sx={{ mt: 1, color: "text.secondary" }}>
          当前管理端版本变更记录，随构建产物一起注入。
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
        <Chip label={`版本 ${__APP_VERSION__.version}`} color="primary" />
        <Chip label={`Git ${__GIT_SHA__}`} variant="outlined" />
      </Stack>

      <List disablePadding>
        {versionItems.map((item, index) => (
          <Box key={item.label}>
            {index > 0 ? <Divider /> : null}
            <ListItem sx={{ px: 0 }}>
              <ListItemText
                primary={item.label}
                secondary={item.value}
                slotProps={{
                  secondary: {
                    sx: {
                      fontFamily:
                        item.label === "Git Hash" ? "monospace" : undefined,
                      overflowWrap: "anywhere",
                    },
                  },
                }}
              />
            </ListItem>
          </Box>
        ))}
      </List>

      <Stack spacing={2}>
        {changelogEntries.length > 0 ? (
          changelogEntries.map((entry) => (
            <Box
              key={entry.version}
              sx={{
                border: "1px solid rgba(30, 41, 59, 0.12)",
                borderRadius: 2,
                p: 2.5,
              }}
            >
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6">{entry.version}</Typography>
                  {entry.date ? (
                    <Typography sx={{ color: "text.secondary" }}>
                      {entry.date}
                    </Typography>
                  ) : null}
                </Box>

                {entry.sections.map((section) => (
                  <Box key={section.title}>
                    <Typography sx={{ fontWeight: 700, mb: 0.75 }}>
                      {section.title}
                    </Typography>
                    <List dense disablePadding>
                      {section.items.map((item) => (
                        <ListItem
                          key={item}
                          sx={{ display: "list-item", py: 0.25 }}
                        >
                          <Typography>{item}</Typography>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ))}
              </Stack>
            </Box>
          ))
        ) : (
          <Typography sx={{ color: "text.secondary" }}>
            暂无 changelog 内容。
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}

function formatBuildTime(value: string): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }

  return new Date(timestamp).toLocaleString();
}

type ChangelogEntry = {
  date: string;
  sections: Array<{ title: string; items: string[] }>;
  version: string;
};

function parseChangelog(markdown: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let currentEntry: ChangelogEntry | null = null;
  let currentSection: { title: string; items: string[] } | null = null;

  for (const rawLine of markdown.split(/\r?\n/u)) {
    const line = rawLine.trim();
    const entryMatch = /^##\s+(.+?)(?:\s+-\s+(.+))?$/u.exec(line);
    if (entryMatch) {
      currentEntry = {
        version: entryMatch[1],
        date: entryMatch[2] ?? "",
        sections: [],
      };
      currentSection = null;
      entries.push(currentEntry);
      continue;
    }

    const sectionMatch = /^###\s+(.+)$/u.exec(line);
    if (sectionMatch && currentEntry) {
      currentSection = { title: sectionMatch[1], items: [] };
      currentEntry.sections.push(currentSection);
      continue;
    }

    const itemMatch = /^-\s+(.+)$/u.exec(line);
    if (itemMatch && currentSection) {
      currentSection.items.push(itemMatch[1]);
    }
  }

  return entries;
}
