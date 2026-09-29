# Current Task

## Goal

将 ali-oss-server 接入 evp-agents v3 模板，并把当前仓库的稳定架构、行为契约、开发/测试/部署流程迁入正式 `docs/` 知识库。

## Done when

- 根目录存在 v3 `AGENTS.md`，且项目特有约束已补充。
- `.agents/agents/` 包含 v3 五个 vendor-neutral 角色定义。
- `docs/` 的 context、architecture、specs、decisions、runbooks、knowledge、exec-plans 已按当前仓库事实初始化。
- 不删除原有 `.agents/archive/`、`.agents/skills/`、`.agents/decisions.md`、`.agents/lessons.md` 历史资料。
- 不改变产品代码、公开 API、依赖或运行行为。

## Parent task complexity

- Planning complexity: S2
- Why: 需要将通用 v3 规范映射到现有 monorepo、历史 Agent 资料和安全/发布边界，但实现本身主要是文档迁移。

## Work units

| ID | 工作单元 | 模式 | 状态 | 独立难度 | 路由 | 评级理由 / 交接产物 | 验证 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | 核对 v3 模板结构和 ali-oss-server 当前结构 | investigate | done | S0 | scout | Evidence Pack：模板目录、模块、脚本、历史决策 | GitHub 文件与 tree 检索 |
| T2 | 决定长期知识与短期 Agent 状态的迁移边界 | decide | done | S2 | worker | 保留历史 `.agents`；新的稳定事实进入 `docs/` | 文档结构 review |
| T3 | 写入 v3 入口、角色和项目化 docs | execute | done | S1 | fast-worker | 按确定结构进行机械文档接入 | 最终 diff review |
| T4 | 独立检查范围、链接和事实一致性 | review | pending | S0 | reviewer | 只检查文档，不改产品行为 | PR diff |

## Evidence / blockers

- 当前仓库已有旧式 `.agents/` 历史资料和 `maintain-changelog` skill，但没有根 `AGENTS.md` 与正式 `docs/` v3 知识库。
- 仓库当前没有自动化测试套件或 CI workflow；testing runbook 必须如实记录这一现状。
- 本任务不需要运行产品构建；若 review 发现误改产品代码，则视为 blocker。

## Implementation Briefs

### T2

- Decision: v3 以 `AGENTS.md` + `.agents/agents/` + `docs/` 为新事实入口；迁移前历史文件保留但不再作为新增长期知识的默认写入点。
- Files / interfaces: 仅 Agent/文档文件。
- Invariants: 不改产品代码、不删除历史、不写入真实密钥。
- Acceptance: 新会话只读入口文档即可知道如何检索、实施、验证和写回知识。
- Do not: 不引入 CI、测试框架、数据库或发布自动化。
- Focused validation: PR diff + 文档交叉链接检查。
