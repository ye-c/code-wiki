---
name: code-wiki
description: Generate and maintain OKF-compliant code navigation wiki. Triggers on: map this codebase, generate wiki, create navigation map, document architecture, OKF wiki, code map, update wiki, lint wiki, sync wiki drift, ingest this.
argument-hint: "[init|update|lint|ingest]"
---

# code-wiki

Route by argument: `init` / `update` / `lint` / `ingest`. Default = `init`.

---

## init

Generate OKF v0.1 compliant code navigation wiki for the current project.

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

**Output**: list of candidate domains, each with evidence and concept candidates.

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

```markdown
---
type: Concept
title: <inferred from code symbol or directory name>
description: <one sentence from file header comment or exports>
resource: <source path, e.g. src/services/api/>
tags: [<domain>, <tech stack>]
timestamp: <ISO 8601 today>
---

# Key Files

- `<path>` — <inferred purpose>

# Dependencies

- Imports from [other concept](/domain/concept.md)
- External: <package names from imports>
```

For each domain, write `.wiki/<domain>/index.md` (domain navigation map, reuses OKF §6 reserved name):

```markdown
---
type: Domain
title: <domain name>
description: <one sentence summary>
resource: <domain root path>
tags: [<domain>]
timestamp: <ISO 8601 today>
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
timestamp: <ISO 8601 today>
---

# Conventions

<extracted key rules, brief>
```

**Rules**:
- Use `Write` tool for each file
- Infer title from: export names, class names, directory name (in that priority)
- Infer description from: file header comment, module docstring, first meaningful line
- Dependencies: scan imports, group into internal (wiki cross-link) and external (package name)
- Keep body thin — no Architecture, no Gotchas sections at init

### Phase 4: INDEX

Write `.wiki/index.md`:

```markdown
---
okf_version: "0.1"
generator: code-wiki
generated_at: <ISO 8601 now>
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

**4. Output**:

```
已创建 .wiki/ 并设置 .gitignore *
- wiki 默认不进 git，仅本地使用
- 想团队共享：删掉 .wiki/.gitignore，git add .wiki/，commit
- 已自动更新 CLAUDE.md，添加 Code Wiki Retrieval Protocol
- CC 每次会话会先读 .wiki/index.md 再动代码
- 想跳过：删除 CLAUDE.md 里的 "## 🤖 Code Wiki Retrieval Protocol" 段
```

---

## update

TODO: 实现见 docs/modules/03

## lint

TODO: 实现见 docs/modules/04

## ingest

TODO: 实现见 docs/modules/05
