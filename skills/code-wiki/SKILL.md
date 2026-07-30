---
name: code-wiki
description: Generate and maintain OKF-compliant code navigation wiki. Triggers on: map this codebase, generate wiki, create navigation map, document architecture, OKF wiki, code map, update wiki, lint wiki, sync wiki drift, ingest this.
argument-hint: "[init|update|lint|ingest]"
---

# code-wiki

Route by argument: `init` / `update` / `lint` / `ingest`. Default = `init`.

## Global: Task Planning

All code-wiki operations are multi-phase long-chain tasks. Before starting, use `TaskCreate` to create tasks for each phase. Mark each `in_progress` when starting, `completed` when done. This keeps you and the user tracking progress and prevents phase skipping.

## Concept Body Sections

Every concept **MUST** have a `## Purpose` section. Select 0-3 additional sections based on module type:

| Module type | Sections |
|-------------|----------|
| Strategy / Service / Business logic | Purpose + Usage + Relationships |
| Utility functions / Helpers | Purpose + Usage |
| Config / Constants | Purpose + Notes |
| Infrastructure (cache/logger/db) | Purpose + Notes |
| Entrypoint / Orchestration | Purpose + Relationships |

**Section definitions**:
- `## Purpose` — one-sentence business purpose. Infer from function names + params + call patterns.
- `## Usage` — how to use, not how built. Key signatures + semantics.
- `## Relationships` — cross-concept data/control flow, including polymorphic dispatch.
- `## Notes` — edge conditions / side effects / data formats / state. Catch-all.

**Do NOT generate at init** (mark `<!-- TODO: ingest -->` placeholder):
- Gotchas (requires experience)
- ADR (requires decision context)
- Performance (requires measurement)

---

## init

Generate OKF v0.1 compliant code navigation wiki for the current project.

Create 6 tasks: DISCOVER / PROPOSE / AUTHOR / INDEX / VALIDATE / Finalize.

### Phase 1: DISCOVER

Scan project root to identify domains and concepts.

**Manifest scan** (highest priority):
- `package.json` → `workspaces`, `main`, `exports`
- `pyproject.toml` → `[project]`, `[tool.*]`
- `Cargo.toml` → `[workspace.members]`
- `go.mod` → module path
- `pom.xml` / `build.gradle` → modules

**Directory structure** (conventional):
- `src/` `lib/` `app/` `cmd/` `internal/` `pkg/` `core/`
- Subdirectories with multiple source files → candidate domain

**Business context**:
- Read README (if exists) to extract business summary
- Read each candidate domain's entry file to infer business purpose

**Always exclude from domain detection** (don't scan, don't build concepts):
- Test dirs: `tests/` `test/` `__tests__/` `spec/` `*_test/` `test_*`
- Dep dirs: `node_modules/` `.venv/` `venv/` `__pycache__/` `.tox/` `dist/` `build/` `target/` `vendor/`
- Non-source: `.env`, `*.ipynb` (unless notebook project), `*.html`, `assets/` `public/` `static/`
- Hidden: `.*/` (git/config dirs)
- Lock files: `uv.lock` `package-lock.json` `Cargo.lock` `go.sum`
- Generated: `*.pyc` `*.min.js`

**Domain detection rules**:
- Single-layer pure test dir (e.g. `tests/` with only `test_*.py` or `*_test.go`) → **don't build domain**, optionally note in `conventions.md` under a `# Testing` section.
- Root-level scattered source files (e.g. `drift_probe.py`, `main.go`) → **don't build domain**.
  - Exception: if a root file is an entrypoint (e.g. `server.py` ASGI entry, `main.go` CLI entry, `app.py` Flask app), mention it in `conventions.md` under a `# Entrypoints` section with one-line purpose. Don't build a dedicated domain for a single root file.
  - If the root has multiple business files (3+), build a `<project>` or `root` domain for them.
- A directory becomes a domain only if it contains business logic (multiple source files that aren't all tests).

**Output** (structured, not just "Phase 1 done"):
```
## DISCOVER Output
- README: yes/no (summary: ...)
- Candidate domains:
  - <domain>: N files, entry <entry>, purpose: <one sentence>
  - ...
```

### Phase 2: PROPOSE

Output domain partition draft, then **immediately continue to Phase 3 AUTHOR** — do NOT stop or wait for confirmation.

```
## 候选域划分

### Domain: <name>
Evidence:
  - <manifest/dir evidence>
Proposed concepts:
  - <domain>/<concept> ← <source path>
  ...

继续生成 wiki...
```

User can adjust domain partition after init by re-running or editing `.wiki/` directly.

### Phase 3: AUTHOR

For each domain, create `.wiki/<domain>/` directory. For each concept, write `.wiki/<domain>/<concept>.md`:

**Get actual timestamp** via Bash: `date -u +"%Y-%m-%dT%H:%M:%S%z"`

**IMPORTANT**: Follow the 3 examples above. Each concept MUST have:
1. `## Purpose` section (mandatory — validate-okf.js checks this)
2. Appropriate sections based on module type (see examples)
3. `## Key Files` section
4. `## Dependencies` section
5. `<!-- TODO: ingest -->` placeholder at the end

Omit sections that don't apply to the module type. Do NOT include all 4 sections for every concept.

For each domain, write `.wiki/<domain>/index.md` (domain navigation map, reuses OKF §6 reserved name):

```markdown
---
type: Domain
title: <domain name>
description: <one sentence summary>
resource: <domain root path>
tags: [<domain>]
timestamp: <ISO 8601 now>
---

# Concepts

- [concept title](concept.md) — description
```

If project has `CLAUDE.md`, `CONTRIBUTING.md`, or `.editorconfig`, write `.wiki/conventions.md`:

```markdown
---
type: Convention
title: Project Conventions
description: Coding standards and project-level rules
resource: <list of source files>
tags: [meta]
timestamp: <ISO 8601 now>
---

# Conventions

<extracted key rules, brief>
```

**Rules**:
- Use `Write` tool for each file
- **Write files BEFORE announcing phase complete** — no "Phase 3 done" then write files
- Infer title from: export names, class names, directory name (in that priority)
- Infer description from: file header comment, module docstring, first meaningful line
- Dependencies: scan imports, group into internal (wiki cross-link) and external (package name)

### Phase 4: INDEX

Write `.wiki/index.md`:

```markdown
---
okf_version: "0.1"
generator: code-wiki
generated_at: <ISO 8601 now from Bash date command>
sync_commit: <git HEAD short hash>
---

# <Project Name> Code Wiki

## <Domain 1>

* [Title](domain/concept.md) - description
* ...

## <Domain 2>

* ...
```

Get project name from manifest (`package.json` name / `pyproject.toml` project.name / directory basename).
Get git HEAD via `git rev-parse --short HEAD`.

### Phase 5: VALIDATE

Run: `node <plugin-dir>/scripts/validate-okf.js .wiki`

If errors > 0: fix and re-validate. If warnings: report but continue.

### Phase 6: Finalize

**1. CLAUDE.md injection** (three-branch detection):

Read project root `CLAUDE.md` (if exists).

- **No CLAUDE.md**: Create it with protocol section.
- **Has CLAUDE.md, no `## 🤖 Code Wiki Retrieval Protocol`**: Append protocol section at end.
- **Has CLAUDE.md with protocol section already**: Update in place (replace old section).

Protocol section content:

```markdown

## 🤖 Code Wiki Retrieval Protocol

@.wiki/index.md

Before reading or editing any files, you MUST:
1. Read the `.wiki/index.md` imported above to identify which domain/module your task belongs to.
2. Use the `Read` tool to load that domain's map under `.wiki/`.
3. Follow the dependencies and guidelines in that map before touching the source code.
4. **Dynamic Addressing**: Do not trust or ask for absolute line numbers. Use `Grep` to find the exact current location of classes/functions mentioned in the Wiki.
5. **Boy Scout Rule**: If you find the Wiki is missing details or outdated while completing your task, you MUST incrementally update the corresponding map and its `sync_commit` hash.
```

**2. log.md**: Write `.wiki/log.md`:

```markdown
# Wiki Update Log

## <today ISO date>
* **init**: Generated initial wiki. N domains, M concepts. sync_commit=`<hash>`.
```

**3. .gitignore**: Write `.wiki/.gitignore` with content `*`.

**4. Output** (mandatory, do not skip):

```
## Wiki 初始化完成
- 域: N 个
- 概念: M 个
- sync_commit: <hash>
- .gitignore: * (本地模式，删 .gitignore 切共享)
- CLAUDE.md: 已注入协议段

wiki 默认不进 git，仅本地使用
- 想团队共享：删掉 .wiki/.gitignore，git add .wiki/，commit
- 已自动更新 CLAUDE.md，添加 Code Wiki Retrieval Protocol
- CC 每次会话会先读 .wiki/index.md 再动代码
- 想跳过：删除 CLAUDE.md 里的 "## 🤖 Code Wiki Retrieval Protocol" 段
```

---

## update

Incrementally update wiki after code changes. Three phases: DETECT → REGENERATE → VALIDATE.

Create 3 tasks: DETECT / REGENERATE / VALIDATE.

### Phase 1: DETECT

1. Read `.wiki/index.md`, parse frontmatter, extract `sync_commit`.
2. Run `git rev-parse --short HEAD` → current HEAD.
3. Build changed file list:
   - **HEAD == sync_commit**: run `git status --porcelain`. If output is empty → print `wiki 已是最新，无需更新` and **stop**. Otherwise extract file paths (strip status prefix like `?? `, `M  `, etc.).
   - **HEAD != sync_commit**: run `git diff <sync_commit>..HEAD --name-only` for committed changes. Also run `git status --porcelain` for uncommitted changes. Merge and deduplicate both lists.
4. Filter out non-source paths: anything under `.wiki/`, `.git/`, `node_modules/`, `__pycache__/`, `.venv/`, `.tox/`, `dist/`, `build/`.

### Phase 2: REGENERATE

1. Scan all `.wiki/**/*.md` (except `index.md`, `log.md`). Parse each file's frontmatter `resource` field.
2. Build reverse map: `resource path → concept file path`.
3. For each changed file, find owner concept(s):
   - **Exact match**: `resource` value equals the file path.
   - **Directory match**: `resource` is a directory prefix of the file path (e.g., resource `tts/` matches `tts/kokoro.py`).
   - **No match**: record as unmapped.
4. For each affected concept file:
   - Re-read the source files it covers (from `resource` field).
   - Update frontmatter `timestamp` to today (ISO 8601).
   - **Regenerate Section Vocabulary 4 sections** (per P2 selection table):
     - `## Purpose` — business purpose (update if code semantics changed)
     - `## Usage` — how to use (update if API changed)
     - `## Relationships` — connections (update if dependencies changed)
     - `## Notes` — edge conditions (update if code boundaries changed)
   - Regenerate `## Key Files` section: list current source files with one-line purpose each.
   - Regenerate `## Dependencies` section: scan imports, group into internal (wiki cross-link) and external (package name).
   - **Do NOT modify** any freeform sections (Gotchas / ADR / user-written content, including content after `<!-- TODO: ingest -->` placeholders). Keep them as-is.
5. For unmapped files: do not create new concepts. Record them for the log entry.

### Phase 3: VALIDATE

1. Run `node <plugin-dir>/scripts/validate-okf.js .wiki`. If errors > 0: fix and re-validate.
2. Update `.wiki/index.md` frontmatter: set `sync_commit` to current HEAD short hash, update `generated_at` to now.
3. Append to `.wiki/log.md` (create `## <today>` heading if not present):
   ```
   * **update**: Synced N concepts (<names>). Unmapped: M files (<names including filenames>). sync_commit=`<hash>`.
   ```
   **Important**: include actual changed file names in the log entry for traceability. Ensure the file ends with a trailing newline.
4. Output:
   ```
   update 完成
   - 检测 N 个变更文件
   - 更新 M 个 concept: <list>
   - K 个未映射文件: <list>
   - sync_commit → <hash>
   ```

## lint

Run `node <plugin-dir>/scripts/validate-okf.js .wiki`. Report output to user verbatim. If warnings: list each with one-line fix suggestion. Do not auto-fix — lint is read-only.

Common warnings and suggestions:
- `broken link → /x/y.md` — target missing. Either write the page or fix the path.
- `orphan page` — no inbound links. Add a link from index.md or a related concept.
- `stale resource 'x/'` — code path deleted. Update `resource` field or delete the concept.

## ingest

User says "归档这个" / "ingest this" / `/code-wiki ingest [type] [name]`.

Create 6 tasks: Read / Classify / Check Placeholder / Generate / Place / Update.

### 1. Read recent assistant replies

Scan the current conversation for substantive content worth archiving.

### 2. Classify by explicit rules (not heuristic)

Match content against these rules in order:

| Content signal | type |
|----------------|------|
| Contains "X 流到 Y" / "请求路径" / "执行路径" / "请求从 A 到 B" | **Flow** |
| Contains "决定用 X" / "选 X 不选 Y" / "因为 Z" / "权衡" | **ADR** |
| Contains "字段 X 在 A 被" / "env var" / "状态传播" / "配置在" | **StateMap** |
| Contains "踩过坑" / "要注意" / "特殊情况" / "实测发现" | **Gotchas** (fill concept TODO placeholder) |
| Contains "性能" / "benchmark" / "耗时" / "吞吐" | **Performance** (fill concept TODO placeholder) |
| Edge case handling / "特殊情况" | append to existing Convention page's `# Edge Cases` section |
| None match | do not archive, tell user "内容不适合归档" |

If type unclear or multiple match: list candidates, let user pick. User can also force type via `/code-wiki ingest Flow <name>`.

### 3. Check for matching `<!-- TODO: ingest -->` placeholder

**Gotchas / Performance / ADR content**: scan existing concept files for `<!-- TODO: ingest -->` placeholders. If the conversation content matches a concept's placeholder, **fill the placeholder** (don't create new page).

**Flow / StateMap content**: usually create new page (cross-concept flow/state propagation).

**Can't determine which concept**: ask user.

### 4. Generate frontmatter + thin body (or fill placeholder)

**Fill placeholder**: if step 3 found a match, insert content at the placeholder location (don't create new page). Update the concept's frontmatter `timestamp` to today.

**New page**: if step 3 found no match, generate new page.

**Flow template**:
```markdown
---
type: Flow
title: <Flow name>
description: <one sentence>
tags: [<related domain>]
timestamp: <ISO 8601 today>
---

# Trigger

<when this flow fires>

# Path

1. <entry> → <first stop>
2. <first stop> → <second stop>
3. ...

# Notes

<key decision points, edge cases>
```

**ADR template**:
```markdown
---
type: ADR
title: <decision name>
tags: [<related domain>]
timestamp: <ISO 8601 today>
---

# Context

<why this decision was needed>

# Decision

<the decision>

# Consequences

<what this means going forward>
```

**StateMap template**:
```markdown
---
type: StateMap
title: <state field name>
description: <one sentence>
tags: [<related domain>]
timestamp: <ISO 8601 today>
---

# Field

- Name: `<env var or state field>`
- Type: `<type>`

# Propagation

| File | Usage |
|------|-------|
| `<path>` | <how used> |

# UI Impact

<which UI elements this field affects>
```

**Convention fragment**: do not create new file. Append to existing `.wiki/conventions.md` (or relevant Convention page) under `# Edge Cases` section.

### 5. Write to domain directory (or update existing concept)

**Fill placeholder**: if step 3 found a match, the concept file was already updated in step 4. Skip this step.

**New page**:
- Flow/ADR/StateMap → `.wiki/<most-relevant-domain>/<name>.md`
- Convention fragment → append to existing Convention file
- If domain unclear: ask user.

### 6. Update index.md + log.md + validate

**index.md**: add new page to the relevant domain group (not needed for placeholder fills).

**log.md** (create `## <today>` heading if missing):
```
* **ingest**: Added `<path>` (type: <Type>). Captured <one-line description>.
```

If filling placeholder:
```
* **ingest**: Filled `<!-- TODO: ingest -->` in `<concept-path>` with <Type> content.
```

**validate**: run `node <plugin-dir>/scripts/validate-okf.js .wiki`. If errors > 0: fix and re-validate.
