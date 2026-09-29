# Current Task

Status: done

## Goal

完成 Issue #2：`uploadStream({ fileName })` 支持 Unicode 文件名，并保持旧 `x-file-name` 字面量兼容；实现协议、测试、文档并提交。

## Parent task complexity

S2：SDK ↔ HTTP header ↔ server 的公开协议需要兼容性决策。决策完成后的编码、测试和文档分别降为 S1。

## Work units

| ID  | 工作单元                            | 模式        | 难度 / 路由      | 状态    | 验收                             |
| --- | ----------------------------------- | ----------- | ---------------- | ------- | -------------------------------- |
| T1  | Issue 与现有 header 流程 triage     | investigate | S0 / scout       | done    | Evidence Pack，无重复修复线索    |
| T2  | 决定 Unicode filename wire protocol | decide      | S2 / 主 Agent    | done    | 无歧义 Implementation Brief      |
| T3  | SDK/server 实现协议                 | execute     | S1 / fast-worker | done    | Unicode 可传输；非法编码 400     |
| T4  | 协议、SDK/server 测试及公共文档     | execute     | S1 / fast-worker | done    | 指定文件名、错误、objectKey 覆盖 |
| T5  | 指定包验证与最终 diff               | verify      | S0 / 主 Agent    | done    | typecheck、build、测试通过       |
| T6  | 独立兼容性与安全 review             | review      | reviewer         | done    | 无 blocker                       |
| T7  | 聚焦 Issue #2 的提交                | execute     | 主 Agent         | done    | 聚焦提交                        |

## Evidence Pack

- SDK `uploadStream` 将 trim 后文件名原样赋给 `x-file-name`；Node fetch 可能在发送前拒绝 Unicode header。
- Server route 将该 header 字面量传给 `uploadStream`；服务层从原始文件名取 basename，缺省为 `file`，再由服务端添加 `clientId/`、检查控制字符和 UTF-8 长度。
- `x-object-key` 有值时优先于文件名。当前服务端 `badRequest` 经 error-handler 输出结构化 400。
- Issue #1 的 SDK `test:consumer` 已建立 Node 内置测试基础。Issue #2 无关联 PR，工作树初始干净。

## Implementation Brief

- ASCII 可打印文件名（trim 后）继续发送字面量 `x-file-name`，包括 `%`、空格和 `#`；不对旧 header 进行 URI 解码。
- 非 ASCII 文件名发送独立的 `x-file-name-utf8`，值为 `UTF-8''` 加 RFC 5987 风格 UTF-8 百分号编码，保证全 ASCII。SDK 一次只发送一个 filename header。
- Server 检查 header 是否同时存在；双 header、空/错误前缀、非法 `%`、无效 UTF-8、解码后的控制字符等返回项目现有 `badRequest` 风格的 400。合法编码仅解码一次，再将原始文件名交现有服务层推导 objectKey。
- 旧 SDK / 新 server：旧 header 始终字面量；新 SDK / 新 server：ASCII 旧 header、Unicode 新 header；现有直接 ASCII client 不变。新 SDK / 旧 server 的 ASCII 兼容，Unicode 需要新 server。
- 保持 `x-object-key` 的既有优先级和服务端对象 key 安全规则。内部 helper 不作为 SDK 包根公开 API。

## Result

- SDK 与 server 的 typecheck、build 通过；SDK `test:consumer` 1/1、server `test:protocol` 2/2 通过。
- 独立 Reviewer 未发现 blocker。主 Agent 追加修复 encoded header 中原始换行符的校验漏洞并补回归案例。
- 全仓 `format:check` 发现 28 个既有未格式化文件；本任务修改文件单独格式检查通过。
