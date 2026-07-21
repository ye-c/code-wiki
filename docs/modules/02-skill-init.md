# 02 - Skill: init 操作

> Status: **TODO**
> 依赖: 01

## 目标

实现 `/code-wiki init` — 为任意项目生成 OKF 合规的代码导航 wiki。

## 流程（5 阶段）

```
DISCOVER  → PROPOSE → [用户确认] → AUTHOR → INDEX → VALIDATE → [注入 CLAUDE.md] → [初始化 log.md] → [设置 .gitignore]
```

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

**输出**：候选域列表 + 每个域的证据 + 每个域下的 concept 候选

### 阶段 2: PROPOSE — 草案 + 暂停

**输出格式**（草案，不写文件）：
```
## 候选域划分（草案，未写文件）

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

确认这样划分？回复"确认"或"调整：合并 X/Y，把 Z 独立成域"。
```

**关键**：输出草案后停止，不进入 AUTHOR。靠 CC 自然对话轮次等用户回复，不引入状态文件或 flag。用户确认后继续 AUTHOR；调整则重跑 PROPOSE。

### 阶段 3: AUTHOR — 生成 concept 文件

**薄 body 模板**（P2 定）：
```markdown
---
type: Concept
title: <从代码符号或目录名推断>
description: <一句话，从文件顶部注释或 README 抽>
resource: <代码路径，如 src/services/api/>
tags: [<域>, <技术栈>]
timestamp: <生成时间 ISO 8601>
---

# Key Files

- `<path>` — <从文件首行注释或 export 名推断>

# Dependencies

- Imports from [other concept](/domain/concept.md)
- External: <package names>
```

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
generated_at: <timestamp>
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

### 阶段 6: 收尾

1. **注入 CLAUDE.md 协议段**（模块 08）
2. **初始化 `.wiki/log.md`**：
   ```markdown
   # Wiki Update Log

   ## <today>
   * **init**: Generated initial wiki. N domains, M concepts. sync_commit=`<hash>`.
   ```
3. **设置 `.wiki/.gitignore`**：内容 `*`
4. **输出告知**：
   ```
   已创建 .wiki/ 并设置 .gitignore *
   - wiki 默认不进 git，仅本地使用
   - 想团队共享：删掉 .wiki/.gitignore，git add .wiki/，commit
   - 已自动更新 CLAUDE.md，添加 Code Wiki Retrieval Protocol
   - CC 每次会话会先读 .wiki/index.md 再动代码
   - 想跳过：删除 CLAUDE.md 里的 "## 🤖 Code Wiki Retrieval Protocol" 段
   ```

## 关键决策

- **PROPOSE 暂停**（P3）— 输出草案后停止，靠 CC 对话轮次等确认，不引入状态机制
- **薄 body**（P2）— 不生成 Architecture/Gotchas
- **`.wiki/` + `.gitignore *`**（P4）— 默认本地用
- **init 默认 4 type**（P1）— Domain/Concept/Index/Convention

## 辅助脚本（按需）

如果 CC 临场推理不稳，加：
- `scripts/discover-domains.js` — manifest + 目录扫描
- `scripts/insert-frontmatter.js` — 批量插 frontmatter

**Ponytail 原则**：先纯 SKILL.md 指令，跑 dogfood 发现不稳才加脚本。

## 验证

- [ ] 在 claude-bro 跑 `/code-wiki init`，生成 `.wiki/`
- [ ] 生成的文件全部 OKF 合规（跑模块 09 校验）
- [ ] PROPOSE 阶段输出草案后确实停止，不进入 AUTHOR
- [ ] CLAUDE.md 被正确注入协议段
- [ ] `.wiki/log.md` 有 init 记录
- [ ] `.wiki/.gitignore` 内容是 `*`

## TODO

- [ ] 写 DISCOVER 阶段指令（SKILL.md）
- [ ] 写 PROPOSE 阶段指令 + 输出格式
- [ ] 写 AUTHOR 阶段指令 + 薄 body 模板
- [ ] 写 INDEX 阶段指令 + index.md 模板
- [ ] 接入模块 09 的 VALIDATE
- [ ] 接入模块 08 的 CLAUDE.md 注入
- [ ] 写 log.md 初始化指令
- [ ] 写 .gitignore 设置指令
- [ ] 写收尾输出文案
- [ ] dogfood 验证
