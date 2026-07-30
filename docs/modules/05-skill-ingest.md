# 05 - Skill: ingest 操作

> Status: **DONE**
> 依赖: 02

## 目标

实现 `/code-wiki ingest` — 把对话产物归档成新 wiki 页，或填充现有 concept 的 `<!-- TODO: ingest -->` 占位。

对齐 Karpathy ingest 操作，但语义偏移：
- Karpathy ingest = 吃外部新源（文章/论文）
- code-wiki ingest = 吃对话产物（CC 刚生成的分析/决策）

## 触发

用户显式触发：
- "归档这个"
- "ingest this"
- `/code-wiki ingest`
- `/code-wiki ingest Flow discuss-mode-prompt-injection`

**不主动触发**（P6）— 避免 skill 变成"每次对话都问要不要归档"的噪音。

## 流程

```
1. 读最近 assistant 回复
2. 判断内容类型 → 对应 type
3. 检查是否有匹配的 `<!-- TODO: ingest -->` 占位
4. 生成 frontmatter + 薄 body（或填充占位）
5. 放到对应 domain 目录（或更新现有 concept）
6. 更新 index.md + log.md
```

### 全局要求：Task 规划

ingest 是多阶段长链任务。开始前必须用 `TaskCreate` 创建 6 个任务（对应 6 步骤），每步骤开始时 `TaskUpdate` 标 in_progress，完成标 completed。

### 1. 读最近 assistant 回复

SKILL.md 指示 CC 查看本会话上下文中的最近 assistant 回复（skill 无对话历史 API，靠 CC 上下文窗口）。

**边界情况**：
- 用户指定了特定段 → 读指定段
- 对话太长 → 读最近 N 轮
- 无有效内容 → 提示"没找到可归档的内容"

### 2. 判断内容类型

按明确规则匹配（非启发式），低级模型也能可靠执行：

| 内容信号 | type |
|----------|------|
| 包含 "X 流到 Y" / "请求路径" / "执行路径" / "请求从 A 到 B" | **Flow** |
| 包含 "决定用 X" / "选 X 不选 Y" / "因为 Z" / "权衡" | **ADR** |
| 包含 "字段 X 在 A 被" / "env var" / "状态传播" / "配置在" | **StateMap** |
| 包含 "踩过坑" / "要注意" / "特殊情况" / "实测发现" | **Gotchas**（填充 concept 的 TODO 占位） |
| 包含 "性能" / "benchmark" / "耗时" / "吞吐" | **Performance**（填充 concept 的 TODO 占位） |
| edge case 处理 / "特殊情况" | 追加到已有 Convention 页的 `# Edge Cases` 段 |
| 以上都不匹配 | 不归档，提示"内容不适合归档" |

**判断不准或多重匹配时**：列出候选 type，让用户选。用户也可显式 `/code-wiki ingest Flow <name>` 强制指定。

### 3. 检查是否有匹配的 `<!-- TODO: ingest -->` 占位

**Gotchas / Performance / ADR 内容**：先扫描现有 concept 文件，找 `<!-- TODO: ingest -->` 占位。如果对话内容对应某个 concept 的占位，**填充占位**（不新建页）。

**Flow / StateMap 内容**：通常新建页（跨 concept 的流程/状态传播）。

**找不准对应 concept 时**：提示用户选。

### 4. 生成 frontmatter + 薄 body（或填充占位）

**填充占位**：如果步骤 3 找到匹配的 `<!-- TODO: ingest -->` 占位，直接在占位处插入内容（不新建页）。更新 concept 的 frontmatter `timestamp` 为今天。

**新建页**：如果步骤 3 没找到占位，生成新页。

**Flow 模板**：
```markdown
---
type: Flow
title: <Flow 名字>
description: <一句话>
tags: [<相关域>]
timestamp: <now>
---

# Trigger

<什么时候触发这个 flow>

# Path

1. <入口> → <第一站>
2. <第一站> → <第二站>
3. ...

# Notes

<关键决策点、边界情况>
```

**ADR 模板**：
```markdown
---
type: ADR
title: <决策名>
tags: [<相关域>]
timestamp: <now>
---

# Context

<为什么要做这个决策>

# Decision

<决策内容>

# Consequences

<决策带来的后果>
```

**StateMap 模板**：
```markdown
---
type: StateMap
title: <状态字段名>
description: <一句话>
tags: [<相关域>]
timestamp: <now>
---

# Field

- Name: `<env var 或 state field>`
- Type: `<类型>`

# Propagation

| 文件 | 用途 |
|------|------|
| `<path>` | <怎么用> |
| ...

# UI Impact

<这个字段影响哪些 UI 元素>
```

**Convention 段**：不新建文件，追加到已有 Convention 页的 `# Edge Cases` 段。

### 5. 放到对应 domain 目录（或更新现有 concept）

**填充占位**：如果步骤 3 找到占位，直接更新对应 concept 文件（已在步骤 4 完成），跳过此步骤。

**新建页**：
- Flow/ADR/StateMap → 放到最相关的 domain 目录下
- Convention 段 → 找到对应的 Convention 文件追加

**找不准 domain 时**：提示用户选。

### 6. 更新 index.md + log.md + validate

**index.md**：新页加到对应 domain 分组下（填充占位不需要更新 index）。

**log.md**：
```markdown
## <today>
* **ingest**: Added `<path>` (type: <Type>). Captured <一句话描述>.
```

如果是填充占位：
```markdown
## <today>
* **ingest**: Filled `<!-- TODO: ingest -->` in `<concept-path>` with <Type> content.
```

**validate**：跑 `node <plugin-dir>/scripts/validate-okf.js .wiki`。errors > 0 → 修后重跑。

## 关键决策

- **用户显式触发**（P6）— 不主动问要不要归档
- **ingest 而非 archive/mark/meme**（P6）— 对齐 Karpathy 原词，语义最准
- **判断不准时让用户选**（P3 精神）— 结构性决策值得人工介入
- **薄 body**（P2）— ingest 也是薄 body，后续维护中加厚
- **填充 TODO 占位** — init 阶段标了 `<!-- TODO: ingest -->` 的内容（Gotchas/ADR/Performance），ingest 是填充的自然时机

## 辅助脚本

**不建议脚本化**。ingest 的核心是 LLM 理解对话内容并生成结构化页，这是 LLM 的强项，脚本化反而限制。

## 验证

- [x] 对话里讨论了一个跨层 flow，说"归档这个"，生成 Flow 页
- [x] 对话里做了一个决策，说"归档 ADR"，生成 ADR 页
- [x] 对话里分析了状态传播，说"ingest StateMap"，生成 StateMap 页
- [x] 内容不适合归档时，提示"不适合"
- [x] index.md 和 log.md 正确更新

## TODO

- [x] 写 ingest 流程指令（SKILL.md）
- [x] 写 4 个 type 的模板（Flow/ADR/StateMap/Convention 段）
- [x] 写内容类型分类规则（明确规则，非启发式）
- [x] 写"判断不准时让用户选"逻辑
- [x] 写 index.md + log.md 更新逻辑
- [x] dogfood 验证
