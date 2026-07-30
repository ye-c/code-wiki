# 02 - Skill: init 操作

> Status: **DONE**
> 依赖: 01

## 目标

实现 `/code-wiki init` — 为任意项目生成 OKF 合规的代码导航 wiki。

## 流程（6 阶段）

```
DISCOVER → PROPOSE → AUTHOR → INDEX → VALIDATE → Finalize
```

### 全局要求：Task 规划

init 是多阶段长链任务。开始前必须用 `TaskCreate` 创建 6 个任务（对应 6 阶段），每阶段开始时 `TaskUpdate` 标 in_progress，完成标 completed。这让你和用户都能追踪进度，防止阶段跳过。

### 阶段 1: DISCOVER — 域识别

**输入**：项目根路径（默认 cwd）

**启发式优先级**（Ponytail：先做 1+2，3+4 是 v2）：

1. **manifest 扫描**（最权威）
   - `package.json` 的 `workspaces` 字段
   - `pyproject.toml` 的 `[tool.*]` 分区
   - `Cargo.toml` 的 `[workspace.members]`
   - `go.mod` 的 module 路径
   - `pom.xml` / `build.gradle` 的 modules

2. **目录结构模式**（通用约定）
   - `src/` `lib/` `app/` `cmd/` `internal/` `pkg/` `core/`
   - 子目录文件数 > 阈值 → 可能是子域

3. **文件密度聚类**（v2）
4. **import 图聚类**（v2，可选调 codebase-memory MCP）

**业务上下文**：
- 读 README（如果有）提取业务摘要
- 读每个候选域的入口文件推断业务目的

**输出**（结构化，不能只说"Phase 1 done"）：
```
## DISCOVER 输出
- README: 有/无（业务摘要: ...）
- 候选域:
  - <domain>: N 文件, 入口 <entry>, 业务推断: <一句话>
  - ...
```

### 阶段 2: PROPOSE — 草案 + 立即继续

**输出格式**（草案，不写文件）：
```
## 候选域划分

### Domain: core
Evidence:
  - package.json "main" → src/entrypoints/
  - 4 files matching src/{entrypoints,screens,hooks}/*.tsx
Proposed concepts:
  - core/cli ← src/entrypoints/cli.tsx
  - core/repl ← src/screens/REPL.tsx
  ...

### Domain: services
...

继续生成 wiki...
```

**关键**：输出草案后**立即继续 Phase 3 AUTHOR**，不暂停、不等用户确认。用户事后想调整域划分，可直接编辑 `.wiki/` 或重跑 init。

### 阶段 3: AUTHOR — 生成 concept 文件

**段词表**（P2 定）：每个 concept 的 body 必须包含以下段（按模块性质选 1-4 个）：

| 段 | 必选 | 语义 |
|---|---|---|
| `## Purpose` | ✅ 必选 | 业务目的 / 为什么存在 |
| `## Usage` | 可选 | 怎么用，不是怎么实现 |
| `## Relationships` | 可选 | 连接关系 + 数据流 + 依赖 |
| `## Notes` | 可选 | 边界 / 副作用 / 兜底 |

**段选择决策表**：

| 模块类型 | Purpose | Usage | Relationships | Notes |
|---|---|---|---|---|
| 策略/服务类 | ✅ | ✅ | ✅ | — |
| 工具函数 | ✅ | ✅ | — | — |
| 配置/常量 | ✅ | — | — | ✅ |
| 基础设施（cache/logger） | ✅ | — | — | ✅ |
| 入口/编排 | ✅ | — | ✅ | — |

**Concept 模板**：
```markdown
---
type: Concept
title: <从代码符号或目录名推断>
description: <一句话，从文件顶部注释或 README 抽>
resource: <代码路径，如 src/services/api/>
tags: [<域>, <技术栈>]
timestamp: <ISO 8601 now，用 Bash date 命令取实际时间>
---

## Purpose

<一句话业务目的。读函数名 + 参数 + 调用模式推断。>

## Usage

<关键函数/类的签名 + 语义。不是符号列表，是"怎么用"。>

## Relationships

<这个 concept 和其他 concept 的数据/控制流。含多态分派路径。>

## Notes

<边界条件 / 副作用 / 数据格式 / 状态。兜底段。>

## Key Files

- `<path>` — <从文件首行注释或 export 名推断>

## Dependencies

- Imports from [other concept](/domain/concept.md)
- External: <package names>
```

**明确禁止**（init 不做，标 TODO 占位）：
- ❌ Gotchas（"踩过才知道"）
- ❌ ADR（决策理由）
- ❌ Performance（实测数据）
- ❌ 完整调用图（codegraph 的事）
- ❌ 完整 API reference（README 的事）

如果模块有上述内容的占位需求，在文件末尾加：
```markdown
<!-- TODO: ingest — Gotchas/ADR/Performance -->
```

**过程要求**：
- **timestamp**：用 `date -u +"%Y-%m-%dT%H:%M:%S%z"` 取实际时间，不硬编码午夜
- **write-before-announce**：先写文件，再宣布阶段完成。不允许"Phase 3 done"后才写文件

**init 默认 type 4 个**：Domain / Concept / Index / Convention
- 域导航图 → Domain
- 子系统说明 → Concept
- 项目级规范 → Convention（如果有 CLAUDE.md/CONTRIBUTING.md）

**不生成**：Flow / ADR / StateMap（P1 定，维护中补）

### 阶段 4: INDEX — 生成 index.md

**模板**（OKF §6 + frontmatter）：
```markdown
---
okf_version: "0.1"
generator: code-wiki
generated_at: <ISO 8601 now，用 Bash date 命令取>
sync_commit: <git HEAD>
---

# <Project> Code Wiki

## <Domain 1>

* [Title](domain/concept.md) - description
* ...

## <Domain 2>
* ...
```

### 阶段 5: VALIDATE — OKF 合规校验

调用模块 09 的校验逻辑：
- 每个 non-reserved `.md` 有 frontmatter ✓
- 每个 frontmatter 有非空 `type` ✓
- 断链扫描（警告非错误）

### 阶段 6: Finalize

1. **注入 CLAUDE.md 协议段**（模块 08）
2. **初始化 `.wiki/log.md`**：
   ```markdown
   # Wiki Update Log

   ## <today>
   * **init**: Generated initial wiki. N domains, M concepts. sync_commit=`<hash>`.
   ```
3. **设置 `.wiki/.gitignore`**：内容 `*`
4. **输出摘要**（必选，不能省略）：
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

## 关键决策

- **PROPOSE 不暂停**（B1 修订）— 输出草案后立即继续 AUTHOR，用户事后调整
- **段词表**（P2）— Purpose 必选 + Usage/Relationships/Notes 按需 0-3 个，LLM 按模块性质选段
- **`.wiki/` + `.gitignore *`**（P4）— 默认本地用
- **init 默认 4 type**（P1）— Domain/Concept/Index/Convention
- **Task 规划** — 6 阶段用 TaskCreate 创建任务，每阶段标 in_progress → completed

## 辅助脚本（按需）

如果 CC 临场推理不稳，加：
- `scripts/discover-domains.js` — manifest + 目录扫描
- `scripts/insert-frontmatter.js` — 批量插 frontmatter

**Ponytail 原则**：先纯 SKILL.md 指令，跑 dogfood 发现不稳才加脚本。

## 验证

- [ ] 在 fixture 跑 `/code-wiki init`，生成 `.wiki/`
- [ ] 生成的文件全部 OKF 合规（跑模块 09 校验）
- [ ] PROPOSE 阶段输出草案后立即继续 AUTHOR
- [ ] 每个 concept 有 Purpose 段
- [ ] 策略/服务类 concept 有 Usage + Relationships 段
- [ ] 配置/基础设施 concept 有 Notes 段（无 Usage/Relationships）
- [ ] timestamp 不是午夜硬编码
- [ ] CLAUDE.md 被正确注入协议段
- [ ] `.wiki/log.md` 有 init 记录
- [ ] `.wiki/.gitignore` 内容是 `*`
- [ ] Phase 6 输出完整摘要

## TODO

- [ ] 写 DISCOVER 阶段指令（SKILL.md）
- [ ] 写 PROPOSE 阶段指令 + 输出格式
- [ ] 写 AUTHOR 阶段指令 + 段词表模板
- [ ] 写 INDEX 阶段指令 + index.md 模板
- [ ] 接入模块 09 的 VALIDATE
- [ ] 接入模块 08 的 CLAUDE.md 注入
- [ ] 写 log.md 初始化指令
- [ ] 写 .gitignore 设置指令
- [ ] 写收尾输出文案
- [ ] dogfood 验证
