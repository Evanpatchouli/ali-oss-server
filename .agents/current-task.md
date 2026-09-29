# Current Task

Status: done

## Goal

完成 Issue #1：让 `@ali-oss-server/sdk` 的安装包同时支持 Node >= 20 的 ESM `import` 与 CommonJS `require`，保留现有根公开 API，并提交实现。

## Parent task complexity

S2：需要决定双格式发布、声明文件及安装后条件解析的边界；确定方案后实现和验证可降级。

## Work units

| ID  | 工作单元                                | 模式        | 难度 / 路由             | 状态 | 验收                                 |
| --- | --------------------------------------- | ----------- | ----------------------- | ---- | ------------------------------------ |
| T1  | Issue 与 SDK 当前消费行为 triage        | investigate | S0 / scout              | done | 紧凑 Evidence Pack                   |
| T2  | 决定 ESM/CJS 产物及类型声明结构         | decide      | S2 / worker（主 Agent） | done | Implementation Brief                 |
| T3  | 实现双格式构建和包导出                  | execute     | S1 / fast-worker        | done | 两种产物和条件导出一致               |
| T4  | 建立打包安装后的最小 ESM/CJS 消费测试   | execute     | S1 / fast-worker        | done | 两个独立 Node consumer 实际运行      |
| T5  | 更新 SDK README、测试 runbook、API 契约 | execute     | S1 / fast-worker        | done | 文档与发布行为一致                   |
| T6  | 执行 SDK 验证、检查包内容与最终 diff    | verify      | S0 / scout              | done | typecheck、build、consumer test 通过 |
| T7  | 最终独立只读 review 并修复 blocker      | review      | reviewer                | done | 无真实 blocker                       |

## Evidence Pack

- Issue #1 当前 Open，要求 ESM 不回归、CommonJS 无 workaround 消费、双场景测试与 README 更新；没有关联修复 PR。
- `apps/sdk/package.json` 为 `type: module`，`exports["."]` 仅有 `types` 和 `import`；`main` 指向 ESM。`tsconfig.json` 使用 NodeNext，只输出 ESM JS 与 `.d.ts`。
- `src/index.ts` 的根公开运行时导出为 `AliOssServerSdk`、`createAliOssServerSdk`、`AliOssServerSdkError`，另有八个类型导出。内部相对导入带 `.js` 后缀。
- Node 20 早期版本不能稳定使用 `require(ESM)`；即使新版本支持，现有 exports 也没有 `require` 分支。仓库原无自动化测试框架或 CI。

## Implementation Brief

- Decision: TypeScript 生成 `dist/*.d.ts` 的 ESM 声明和 `dist/cjs/*` 的 CommonJS 实现及声明；`dist/index.js` 是转发同一 CJS 实现的薄 ESM 入口，在 `dist/cjs/package.json` 中声明 `type: commonjs`。不引入打包器。
- Files / interfaces: SDK package/build 配置、轻量 build 脚本、消费测试与直接相关文档；只公布包根入口。
- Invariants: ESM 现有 import 不变；CJS `require` 可直接运行；两个入口共享公开运行时构造器；`exports` 的 import/require 分支各自指向匹配的 JS 与声明；实际实现的 source map 和两套 declaration map 路径有效；`main` 指向 CJS；`files` 包含所有产物；不改公开 API。
- Acceptance: `npm pack` 后在临时独立 consumer 项目安装 tarball；`.mjs` 与 `.cjs` 都从包名加载并检查公开值；SDK typecheck/build 通过。
- Do not: 改 server/admin、公开内部模块、引入大型测试框架或 eval/import workaround。

## Result

- SDK typecheck、build、安装 tarball 后的 ESM/CJS/NodeNext 消费测试和变更文件格式检查均通过。
- Reviewer 首轮发现的构造器身份分裂及 Windows 路径带空格时的测试失效已修复；最终独立复核未发现 blocker。
