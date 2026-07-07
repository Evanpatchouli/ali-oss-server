---
name: maintain-changelog
description: Maintain a concise project CHANGELOG.md for release history. Use when adding, updating, pruning, or reviewing changelog entries, release notes, version logs, admin version-log pages, package version bumps, or deciding what changes belong in a changelog.
---

# Maintain Changelog

## Purpose

Maintain `CHANGELOG.md` as a release history, not a commit log. Keep it useful for operators and users who need to understand meaningful product, API, deployment, or behavior changes.

## Core Rules

- Append a new version block at the top; do not overwrite historical release blocks.
- Record releases, not every commit.
- Prefer short, user-facing wording over implementation details.
- Keep each version focused on meaningful behavior, configuration, deployment, security, compatibility, or bug-fix changes.
- Exclude formatting-only changes, internal refactors with no behavior change, routine dependency churn, generated files, and noisy implementation details.
- Keep versions reverse chronological: newest first.
- Use ISO dates: `YYYY-MM-DD`.
- If the package version changes, ensure the newest changelog heading matches it.

## Version Block Format

Use this structure:

```md
## 1.2.0 - 2026-07-07

### Added

- 新增 ...

### Changed

- 调整 ...

### Fixed

- 修复 ...
```

Only include sections that have entries. Use these headings when they fit:

- `Added`: new capabilities, pages, APIs, config, operational features.
- `Changed`: behavior changes, UI flow changes, defaults, deployment process changes.
- `Fixed`: user-visible bugs, broken flows, incorrect behavior.
- `Removed`: deleted behavior, APIs, options, or pages.
- `Security`: auth, permission, secret-handling, exposure, or vulnerability fixes.
- `Breaking`: incompatible API, config, route, data, or operational changes.

## Entry Criteria

Add an entry when the change is:

- Visible in the UI or API.
- Required for deployment, configuration, or operations.
- Important for debugging, support, or rollback decisions.
- A meaningful bug fix users could have experienced.
- A security, compatibility, persistence, migration, or data-behavior change.

Do not add an entry when the change is only:

- Formatting, linting, comments, or generated build output.
- Internal code movement with no user-visible behavior.
- A test-only change unless it documents a previously broken behavior.
- A dependency update with no behavior, security, or compatibility impact.

## Length Control

Avoid letting the visible admin version-log page become too large:

- Keep the main `CHANGELOG.md` complete unless the project explicitly chooses archival.
- If the file becomes too long for the UI, inject or render only the latest N versions in the app, typically 10.
- If maintainers want a shorter repository file, move old versions into `docs/changelog-archive.md` and add a link from `CHANGELOG.md`.
- Never delete old release history silently; archive it or keep it.

## Workflow

1. Inspect the actual diff, commits, or requested release contents.
2. Identify the release version and date.
3. Add or update the top version block in `CHANGELOG.md`.
4. Group entries under the smallest useful set of sections.
5. Remove noisy entries that are not release-relevant.
6. If a frontend version-log page consumes `CHANGELOG.md`, run the relevant typecheck/build to verify parsing or injection.

## Wording Guidance

- Prefer `新增 Bucket 查询按 URL 自动加载数据。`
- Avoid `修改 AdminConsole useEffect 依赖数组。`
- Prefer `修复目录对象路径被自动转为大写的问题。`
- Avoid `给 MUI Button 增加 textTransform: none。`
