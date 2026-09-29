# Agent 项目规范 v3

> 本文件是 Agent 的地图，不是项目百科全书。
> 项目事实写入代码、测试和 `docs/`；聊天历史只作为工作缓存。

- 更新日期：2026-09-29
- 模板来源：`Evanpatchouli/evp-agents` v3
- 默认工作流：主 Agent + 按工作单元难度路由的 SubAgent
- 目标：更少无关上下文、更少无效重试、更低成本地维持高质量长期迭代
- SubAgent 角色事实源：`.agents/agents/`

## 1. Source of truth

- 代码、测试、配置和可重复的运行结果优先于说明性文本。
- `docs/` 保存需要跨会话长期保留的架构、决策、规范、runbook 和知识。
- `.agents/agents/*.md` 保存供应商无关的 SubAgent 角色定义，所有 AI Agent 都应将其视为角色规范的 canonical source of truth。
- `.agents/current-task.md` 只保存当前任务的短期状态；`.agents/handoff.md` 只在需要交接时更新。
- `AGENTS.md` 只保存长期稳定的执行规则和入口，不写项目百科。
- 重要结论只有写入代码、测试、ADR、runbook 或正式文档后，才算进入项目记忆。
- 现有 `.agents/decisions.md`、`.agents/lessons.md` 和 `.agents/archive/` 是 v3 接入前的历史记录；保留用于追溯，但新的长期事实应写入 `docs/`。

## 2. Retrieval-first / RAG

非平凡任务在实现前先做检索，不把整个仓库塞进上下文。

检索顺序：
1. 精确检索：路径、symbol、引用、`rg`、LSP、Git history、相关测试。
2. 文档检索：先读 `docs/README.md` 和 `docs/context/README.md`，再读直接相关文档。
3. 语义检索：如果项目已接入 file search、向量库或检索 MCP，可作为补充候选源；不可用时不要为此阻塞任务。
4. 合并去重并按“与当前目标直接相关、当前版本有效、能提供行为证据”重排。
5. 只把最高相关的少量材料装入当前 Context Pack。

默认上下文预算是指导值而非硬限制：普通任务尽量保持在约 20K–60K token；跨子系统任务先检索再扩展。不要因为模型支持超长上下文就主动填满窗口。

## 3. 两层拆解与独立评级

简单、局部、低风险任务直接由主 Agent 完成，不为了“多 Agent”而拆分。

非平凡任务采用两层判断：

1. **父任务复杂度**：只用于决定是否需要计划、拆解、跨模块协调和最终 review。
2. **Work Unit 难度**：拆解后每个工作单元必须根据自身实际推理需求重新评级，并据此选择角色和模型。

硬规则：

- 父任务的 S2/S3 **不得自动传播**给子任务。
- 非平凡父任务拆成少量可独立验证的工作单元，记录到 `.agents/current-task.md`；通常 2–6 个即可，不为了数量而拆。
- 每个 Work Unit 只保留一种**主要认知模式**：调查（investigate）、决策（decide）、执行（execute）、验证（verify/review）。
- **混合单元必须优先拆开**：如果一个单元同时包含“需要 Sol 做方案判断”和“方案确定后的机械实现/测试/文档”，应在决策边界处分成 S2 -> S1/S0，而不是整段保持 S2。
- 以行为边界、决策边界和可独立验证性拆分，不按文件数量拆分。
- 拆解应主动暴露可降级工作：检索、fixture/测试数据、机械实现、文档、构建/typecheck、结果整理通常优先考虑 S0/S1。
- 只有工作单元本身需要设计判断、跨模块权衡或普通实现推理时才定为 S2。
- 只有已有真实失败证据且仍存在跨层根因、高风险技术权衡时才定为 S3。
- 工作单元在调查或决策后变简单时必须**重新评级并降级**；不要因为最初判断较难而继续占用高成本模型。
- S2/S3 单元应尽量产出一个紧凑的 **Implementation Brief**（决定、影响文件/接口、invariant、验收与禁止事项），后续 S1 执行只消费这份 Brief + 最小必要代码上下文。
- 只有相互独立、不会频繁写同一文件、并行确有收益的工作单元才并行。
- 主 Agent 始终负责最终决策、合并、验证和完成报告；SubAgent 输出只是证据与实现候选。

## 4. 模型与思考强度路由

先读取对应的 `.agents/agents/<role>.md`，再用当前 AI 运行时可用的原生 SubAgent / child agent / worker 机制映射该角色。

如果当前运行时不支持原生 SubAgent，则由主 Agent 按同样的角色边界串行执行，不跳过必要的 Scout、Worker、Deep Solver 或 Reviewer 阶段。

以下是默认能力路由。模型名是 **Codex 的推荐映射**，不是角色定义的硬依赖；其他 AI Agent 应选择能力与成本最接近的可用模型和思考强度。

| 难度 | 工作单元本身需要什么 | 首选角色 | Codex 推荐映射 |
| --- | --- | --- | --- |
| S0 | 只读定位、读取、总结、执行已知验证、收集证据 | `scout` | GPT-6 Luna / High |
| S1 | 已知方案下的机械实现、fixture、测试脚手架、文档/配置小改 | `fast-worker` | GPT-6 Luna / High |
| S2 | 需要普通设计判断的 feature/bugfix/API/DB/明确边界重构 | `worker` | GPT-6 Sol / Medium |
| S3 | 已有失败证据但根因仍跨层，或并发/事务/安全/高风险迁移 | `deep-solver` | GPT-6 Astra / Low 起步 |
| Review | 非平凡改动的独立复核 | `reviewer` | GPT-6 Sol / High |

评级顺序：

1. 这个 Work Unit 是否只需读取、定位、运行已知命令或整理证据？是 -> S0。
2. 是否已经知道怎么做，只需要按明确方案修改代码/测试/文档？是 -> S1；**代码量大不自动升级到 S2**。
3. 是否仍需要在多个合理方案间做普通工程判断，或接口/invariant/实现边界尚未决定？是 -> S2。
4. 是否已有具体失败证据，但仍需跨抽象层证明根因或处理高风险 invariant？是 -> S3。
5. 如果一个单元同时满足 2 和 3，不按最高等级整包执行；先拆出 S2 决策，再把剩余执行重新评级为 S1/S0。
6. 不确定时先选较低一级，并以真实失败证据升级。

升级 / 降级规则：

- 低成本模型两次仍无法准确定位，或工作单元开始需要跨模块权衡 -> 升级到 S2。
- S2 Worker 已有明确失败证据且仍无法找到根因 -> Sol High 或 S3 Deep Solver。
- Deep Solver 从较低推理投入起步；只有新证据表明推理仍不足时再升级。
- Scout 已经把边界查清、方案变机械后，应把后续实现降到 S1，而不是保留 S2/S3。
- Worker 一旦确定接口、invariant 和实现路径，应结束高成本推理阶段；除非必须用一个最小实现验证设计，否则把剩余编码、测试、文档和常规验证交给 S1/S0。
- 不把最高成本 / 最高强度当默认。
- 某模型因套餐、rollout 或工作区策略不可用时，回退到下一可用档位，不重复重试同一不可用配置。

### Issue 审读 / Triage 路由

别人提交的 Issue 默认先按**调查型 S0**处理，不因为描述很长、日志很多或影响看起来较大就直接使用高成本模型。

默认使用：

```text
scout -> GPT-6 Luna / High
```

Scout 的目标是先形成 Evidence Pack，并回答：

- 问题摘要与用户可观察现象。
- 复现条件是否充分，是否能够复现或验证。
- 是否可能与已有 Issue / PR / commit 重复或已经修复。
- 涉及的模块、调用链和相关测试。
- 已有证据、缺失信息与需要提交者补充的材料。
- 当前是否已经能判断为使用问题、明确缺陷或仍需进一步调查。
- 是否需要升级到更强角色。

升级规则：

- 只是读 Issue、日志、代码、历史记录并整理证据 -> 保持 S0 / Scout / Luna High。
- 已定位相关模块，但需要在多个修复层级、API / 数据模型 / 架构边界之间做工程取舍 -> 升到 S2 / Worker / Sol Medium。
- 涉及安全、事务、并发、数据丢失等高风险问题，且已有具体失败证据需要更深入复核 -> 优先 Sol High；只有根因仍跨层且普通诊断不足时再进入 S3 / Deep Solver / Astra Low。
- Issue 很长、附件很多或日志很多本身**不构成升级理由**。

Issue triage 只负责审读和定性边界，不应顺手修改代码；一旦决定进入修复任务，应重新拆分 Work Unit 并独立评级。

## 5. 成本与委派纪律

- 主 Agent 不应亲自长期执行可以安全交给低成本角色的读重、机械和验证工作。
- 但不要为了省模型单价而制造无意义的 SubAgent 往返：若任务极短、上下文很少、委派成本高于节省，主 Agent 可直接完成。
- 委派时只传递该 Work Unit 所需的最小 Context Pack，不复制整份父任务 Prompt、完整聊天历史或整个仓库上下文。
- S0/S1 的默认目标是减少高成本模型的 active context 和执行时间，而不是最大化 Agent 数量。
- **主 Agent / S2 Worker 的默认职责是决定“怎么做”，不是把已决定的实现从头做到尾。**
- S2/S3 产生的 Implementation Brief 应成为后续低成本执行的主要输入；不要把高成本 Agent 的完整历史上下文再次复制给 S1/S0。
- 同一事实不要让多个 Agent 重复检索；优先复用已验证的 Evidence Pack。
- build/typecheck/test 等已知验证优先由低成本角色执行和汇总，除非失败本身需要更高等级诊断。
- 文档更新和结果汇总在内容已经确定后优先 S1；不要让高成本模型重新推理已确认事实。
- 对一个连贯任务通常只做一次最终独立 review；不要默认每个 Work Unit / commit 都重复启动高成本 Reviewer。高风险边界可例外做定向 review。

## 6. SubAgent 协作约束

- 角色定义统一位于 `.agents/agents/`，不要把供应商专属配置当作角色事实源。
- 给每个 SubAgent 自包含的目标、范围、相关上下文、禁止事项、预期输出和验证要求。
- 读重任务优先交给 `scout`；不要让高成本 Deep Solver 做大范围 grep。
- `deep-solver` 先用于困难诊断和权衡；如果诊断后实现边界已经清楚，优先把具体实现降级交给 `worker` 或 `fast-worker`。
- 多个写 Agent 不得同时修改同一组文件；存在冲突风险时改为串行。
- 不向 SubAgent 传递密钥、token 或不必要的敏感信息。
- 高风险、不可逆、生产环境操作仍需遵循项目权限和人工确认规则。
- 如果某个 AI 工具需要自己的专属 adapter，可以添加薄适配层，但不得复制并分叉 `.agents/agents/` 中的角色语义。

## 7. ali-oss-server 项目约束

- 仓库是 pnpm monorepo：`apps/server`、`apps/admin`、`apps/sdk`。先按模块边界定位，不要默认跨包修改。
- 根 `package.json` 固定 `pnpm@11.9.0`；Docker 运行时使用 Node 24 Alpine；SDK 声明 Node >= 20。
- 服务端当前没有数据库；动态 client、IP allowlist 和限流规则持久化到 `data/runtime-state.json`。不要未经明确需求引入数据库或分布式状态组件。
- `.env` 与 `data/runtime-state.json` 都可能包含敏感信息，不得提交真实凭证，也不要在 Agent 输出中回显密钥。
- 业务对象必须受 `clientId/` 前缀隔离；admin OSS 路由是有意的独立权限边界。涉及 object key 时先读 `docs/specs/api-contracts.md`。
- 业务 token 删除 client 或重置 clientSecret 后应失效；修改认证链路时必须保持这一撤销语义。
- `@ali-oss-server/sdk` 的根导入是公开 API；内部模块可调整，但未经明确 breaking change 不改变包根 `exports` 和公开行为。
- 产品版本由 `pnpm version:app <version>` 同步更新 admin/server；SDK 版本独立管理。
- 当前仓库没有自动化测试套件和 CI 工作流。不要声称“测试通过”除非实际运行了已有验证；验证策略见 `docs/runbooks/testing.md`。
- Changelog 变更优先遵循 `.agents/skills/maintain-changelog/`。

## 8. 实现与验证

- 优先解决根因，不做掩盖症状的临时补丁。
- 保持最小、清晰、可维护的修改；不要顺手重构、升级依赖或格式化整个项目。
- Bugfix 优先建立最小复现或回归测试；新 feature 优先明确行为契约和 Done 条件。
- 完成前运行与改动直接相关的 typecheck、build、format check、smoke 中适用的最小充分集合；若未来加入测试套件，按相关测试优先。
- 验证失败时根据真实错误迭代，不通过削弱断言、跳过测试或隐藏错误来“通过”。
- 非平凡改动完成后交给独立 `reviewer` 检查真实 blocker；纯风格意见不应阻塞。

## 9. 文档写回

只把稳定、未来会复用的知识写回长期记忆：
- 架构事实 -> `docs/architecture/`
- 技术/架构决策及被否决方案 -> `docs/decisions/`
- 产品或行为契约 -> `docs/specs/`
- 开发、测试、部署、排障步骤 -> `docs/runbooks/`
- 长期经验 -> `docs/knowledge/`
- 复杂执行计划 -> `docs/exec-plans/`
- 检索入口和模块索引 -> `docs/context/README.md`

任务过程、临时猜测和一次性日志不要污染长期文档。

## 10. 完成标准

任务完成至少满足：
- 用户目标已实现且没有主动扩大范围。
- 相关验证已执行并通过，或明确记录无法完成的验证及剩余风险。
- 最终 diff 已复核，没有明显无关修改。
- 公共行为、API、数据模型、运行方式或重要架构变化已同步到对应正式文档。
- 需要跨会话继续时已更新 `.agents/handoff.md`。

## 11. 文档入口

- Agent 工作区约定：`.agents/README.md`
- SubAgent 角色：`.agents/agents/`
- 当前任务：`.agents/current-task.md`
- 交接：`.agents/handoff.md`
- 文档地图：`docs/README.md`
- RAG / 上下文检索：`docs/context/README.md`
- 架构：`docs/architecture/README.md`
- 决策：`docs/decisions/README.md`
- 行为规范：`docs/specs/README.md`
- Runbook：`docs/runbooks/README.md`
- 长期知识：`docs/knowledge/README.md`
- 执行计划：`docs/exec-plans/README.md`
