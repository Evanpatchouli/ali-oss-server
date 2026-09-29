# Shared Agent Workspace

`.agents/` 是本项目基于 evp-agents v3 的**供应商无关（vendor-neutral）** AI Agent 协作目录。

所有参与本项目的 AI Agent 先读取根目录 `AGENTS.md`，再按任务读取这里的角色和短期状态。

## 当前目录

```text
.agents/
├── README.md
├── agents/
│   ├── scout.md
│   ├── fast-worker.md
│   ├── worker.md
│   ├── deep-solver.md
│   └── reviewer.md
├── current-task.md
├── handoff.md
├── skills/
│   └── maintain-changelog/
├── decisions.md     # v3 接入前历史记录
├── lessons.md       # v3 接入前历史记录
└── archive/         # v3 接入前任务归档
```

## 约定

- `.agents/agents/*.md` 是 SubAgent 角色定义的 canonical source of truth。
- 角色文件不绑定 Codex、Claude、Gemini 等运行时；模型映射看根 `AGENTS.md`。
- 支持原生 SubAgent 时将原生机制映射到这些角色；不支持时由主 Agent 按相同角色边界串行执行。
- `current-task.md` 只保存当前非平凡任务的短期状态和 Work Unit。
- `handoff.md` 仅用于跨会话/跨 Agent/暂停后的交接；任务完成后清理。
- `skills/` 是项目特有的可执行工作流补充；当前 changelog 规则继续保留。
- `decisions.md`、`lessons.md`、`archive/` 是迁移前历史资料，保留用于追溯，不再作为新知识的默认写入位置。
- 新的长期架构、决策、行为规范、runbook 和知识写入 `docs/`。

不要把任务过程、一次性日志、真实密钥或未验证猜测写进长期文档。
