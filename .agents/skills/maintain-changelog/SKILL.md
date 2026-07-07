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
- Prefer generating release notes from an explicit commit range or tag range, such as `v1.0.0..HEAD`.
- Prefer short, user-facing wording over implementation details.
- Keep each version focused on meaningful behavior, configuration, deployment, security, compatibility, or bug-fix changes.
- Exclude formatting-only changes, internal refactors with no behavior change, routine dependency churn, generated files, and noisy implementation details.
- Keep versions reverse chronological: newest first.
- Use ISO dates: `YYYY-MM-DD`.
- If the package version changes, ensure the newest changelog heading matches it.

## Monorepo Version Policy

This repository has separate release streams:

- Root `CHANGELOG.md` tracks the deployable product: `apps/server` + `apps/admin` + Docker/deployment behavior.
- Product releases should keep `apps/server/package.json` and `apps/admin/package.json` versions aligned.
- Product release tags should use an app/server prefix, for example `app-v1.0.1`.
- `apps/sdk` is independently released. Its version lives in `apps/sdk/package.json`.
- SDK releases should use `apps/sdk/CHANGELOG.md` and tags such as `sdk-v1.0.1`.
- Do not mix SDK-only release notes into the root `CHANGELOG.md`.
- Do not bump `apps/sdk/package.json` during a product release unless the SDK is intentionally being released too.

## Preferred Release Flow

Use this flow when the maintainer commits feature work before bumping the version:

1. Treat feature/fix commits as already completed work.
2. Ask for or infer the release range, preferably from the previous version tag to `HEAD`, for example `app-v1.0.0..HEAD`.
3. If no tag exists, use the maintainer-provided commit count or base commit, for example `HEAD~5..HEAD`.
4. Generate or update `CHANGELOG.md` from that range.
5. Keep the version bump and changelog as a separate release commit, for example `chore(release): 发布 app-v1.0.1`.
6. Recommend tagging the release after the release commit, for example `git tag app-v1.0.1`.

Do not require feature code to be staged when the maintainer explicitly asks for a release changelog based on committed history.

Useful invocation examples:

```text
Use $maintain-changelog to update root CHANGELOG.md for app-v1.0.1 from app-v1.0.0..HEAD.
Use $maintain-changelog to update apps/sdk/CHANGELOG.md for sdk-v1.0.1 from sdk-v1.0.0..HEAD.
Use $maintain-changelog to update CHANGELOG.md for 1.0.1 from the last 5 commits.
Use $maintain-changelog to review CHANGELOG.md before tagging app-v1.0.1.
```

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

1. Identify the source of truth for the release contents:
   - Explicit tag or commit range, preferred for release work.
   - Recent commits, if the maintainer gives a count or base commit.
   - Staged diff, only when the user specifically asks to use staged changes.
   - Manual bullet list, if the user provides one.
2. Identify the release version and date.
3. Inspect the selected source with `git log --oneline`, `git show`, `git diff <range> --stat`, or `git diff --cached` as appropriate.
4. Add or update the top version block in `CHANGELOG.md`.
5. Group entries under the smallest useful set of sections.
6. Remove noisy entries that are not release-relevant.
7. If a frontend version-log page consumes `CHANGELOG.md`, run the relevant typecheck/build to verify parsing or injection.

## Wording Guidance

- Prefer `新增 Bucket 查询按 URL 自动加载数据。`
- Avoid `修改 AdminConsole useEffect 依赖数组。`
- Prefer `修复目录对象路径被自动转为大写的问题。`
- Avoid `给 MUI Button 增加 textTransform: none。`
