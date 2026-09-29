# Execution plans

只有复杂、长周期、需要跨会话持续维护的任务才建立 Exec Plan。

- `active/`：仍在执行的计划。
- `completed/`：值得保留的完成记录。

建议结构：

- Goal
- Scope / Non-goals
- Constraints
- Work units（每个独立评级）
- Dependencies
- Validation
- Rollback
- Progress
- Decisions / Implementation Briefs

简单任务只更新 `.agents/current-task.md`，不要为了流程制造额外文档。
