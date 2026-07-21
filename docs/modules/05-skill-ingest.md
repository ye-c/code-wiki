# 05 - Skill: ingest 操作

> Status: **TODO**
> 依赖: 02

## 目标

实现 `/code-wiki ingest` — 把对话产物归档成新 wiki 页。

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
3. 生成 frontmatter + 薄 body
4. 放到对应 domain 目录
5. 更新 index.md + log.md
```

### 1. 读最近 assistant 回复

SKILL.md 指示 CC 查看本会话上下文中的最近 assistant 回复（skill 无对话历史 API，靠 CC 上下文窗口）。

**边界情况**：
- 用户指定了特定段 → 读指定段
- 对话太长 → 读最近 N 轮
- 无有效内容 → 提示"没找到可归档的内容"

### 2. 判断内容类型

启发式判断该归档成什么 type：

| 内容特征 | type |
|----------|------|
| 跨层执行路径描述（"请求从 A 流到 B 再到 C"） | **Flow** |
| 决策记录（"我们决定用 X 而不用 Y，因为 Z"） | **ADR** |
| 状态/UI/env var 的跨层映射（"这个 flag 在 A/B/C 被读"） | **StateMap** |
| edge case 处理（"Gemini 的 thought signature 要这样处理"） | **Convention** 段 |
| 其他 | 不归档，提示"这个不适合归档" |

**判断不准时**：列出候选 type，让用户选。

### 3. 生成 frontmatter + 薄 body

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

### 4. 放到对应 domain 目录

- Flow/ADR/StateMap → 放到最相关的 domain 目录下
- Convention 段 → 找到对应的 Convention 文件追加

**找不准 domain 时**：提示用户选。

### 5. 更新 index.md + log.md

**index.md**：新页加到对应 domain 分组下。

**log.md**：
```markdown
## <today>
* **ingest**: Added `<path>` (type: <Type>). Captured <一句话描述>.
```

## 关键决策

- **用户显式触发**（P6）— 不主动问要不要归档
- **ingest 而非 archive/mark/meme**（P6）— 对齐 Karpathy 原词，语义最准
- **判断不准时让用户选**（P3 精神）— 结构性决策值得人工介入
- **薄 body**（P2）— ingest 也是薄 body，后续维护中加厚

## 辅助脚本

**不建议脚本化**。ingest 的核心是 LLM 理解对话内容并生成结构化页，这是 LLM 的强项，脚本化反而限制。

## 验证

- [ ] 对话里讨论了一个跨层 flow，说"归档这个"，生成 Flow 页
- [ ] 对话里做了一个决策，说"归档 ADR"，生成 ADR 页
- [ ] 对话里分析了状态传播，说"ingest StateMap"，生成 StateMap 页
- [ ] 内容不适合归档时，提示"不适合"
- [ ] index.md 和 log.md 正确更新

## TODO

- [ ] 写 ingest 流程指令（SKILL.md）
- [ ] 写 4 个 type 的模板（Flow/ADR/StateMap/Convention 段）
- [ ] 写内容类型判断启发式
- [ ] 写"判断不准时让用户选"逻辑
- [ ] 写 index.md + log.md 更新逻辑
- [ ] dogfood 验证
