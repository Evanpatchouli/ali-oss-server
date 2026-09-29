# Current Task

Status: done

## Goal

完成 Issue #3：依据当前代码、ali-oss 6.23.0 和阿里云 OSS 官方行为，明确 SDK 的 objectKey、URL 与删除契约，补足本地 contract tests，并提交聚焦改动。

## Parent task complexity

S2：需要判断哪些已观察行为适合作为长期公共契约；确认后的测试与文档为 S1，常规验证为 S0。

## Work units

| ID  | 工作单元                        | 模式        | 难度 / 路由      | 状态 | 验收                                |
| --- | ------------------------------- | ----------- | ---------------- | ---- | ----------------------------------- |
| T1  | Issue、源码、测试、上游行为取证 | investigate | S0 / scout       | done | Evidence Pack；已证、外部、未知分明 |
| T2  | 确定稳定契约边界                | decide      | S2 / 主 Agent    | done | URL、删除和 namespace 的准确承诺    |
| T3  | 补充 contract tests 与文档      | execute     | S1 / fast-worker | done | 本地可重复测试；spec 为事实源       |
| T4  | 指定验证和 diff 复核            | verify      | S0 / 主 Agent    | done | 实际命令通过，范围聚焦              |
| T5  | 独立 review                     | review      | reviewer         | done | 一处 ACL 表述问题已修正             |
| T6  | Issue #3 提交                   | execute     | 主 Agent         | done | 聚焦提交                            |

## Evidence and decision

- 服务层统一把业务对象限定于 `clientId/`，当输入首段已是当前 clientId 时先移除再加回；SDK 原样接收服务端返回的最终 objectKey。
- 当前 ali-oss 6.23.0 的 `generateObjectUrl` 生成对象地址，不添加签名或过期信息。仅在同一对象和 URL 配置不变时承诺地址稳定；地址能否访问由 OSS 权限决定。
- 阿里云 DeleteObject 官方文档确认对象不存在时仍返回 204；ali-oss 6.23.0 `delete()` 接受 204。服务端等待其成功后返回 `deleted: true`。可承诺调用方可重试删除结果，但版本控制下重复请求可能产生多个删除标记，不能承诺无历史副作用。
- 稳定契约只包含调用方可见的对象隔离、最终 key、URL 类型与删除结果；helper 名、内部数据结构、ali-oss 参数形状和具体 host 不作承诺。

## Result

- 更新 SDK README、API spec 与测试 runbook；新增 server `test:contract`，扩展 SDK `test:consumer`。
- SDK/server 各自 typecheck、build 均通过；server `test:contract` 3/3、`test:protocol` 2/2、SDK `test:consumer` 1/1 通过；修改文件定向 Prettier 检查与 `git diff --check` 通过。
- 独立 review 指出 private bucket 与显式 public-read object ACL 的关系，已按阿里云对象 ACL 文档修正 spec。默认测试不访问真实 OSS；不存在对象返回 204 的依据为阿里云官方 DeleteObject 文档和已锁定 ali-oss 6.23.0 行为。
