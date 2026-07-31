# code-wiki 开发文档

> Generate and maintain OKF-compliant code navigation wiki for any project.

## 项目定位

`code-wiki` 是一个 Claude Code plugin，为任意代码项目生成并维护 OKF v0.1 合规的代码导航 wiki。结合了三个来源的思想：

- **OKF v0.1** (Google, 2026-06) — 格式规范：markdown + YAML frontmatter + `type` 字段
- **Karpathy LLM Wiki** — 维护模式：wiki 是持续累积的资产，LLM 做 grunt work
- **OpenWiki** (LangChain, 2026-07) — 产品形态：git diff 增量更新 + CLAUDE.md schema 注入

**差异化**：
1. OKF 合规（可被其他 OKF 消费者读取）
2. 代码导航专用 `type` 词汇表（7 个）
3. skill 原生（零新增依赖，复用 CC 现有工具）

## 文档导航

### 核心文档
- [architecture.md](architecture.md) — 整体架构设计
- [decisions.md](decisions.md) — P1-P10 决策记录（ADR 式）

### 模块文档（按开发顺序）

| # | 模块 | 文档 | 状态 | 依赖 |
|---|------|------|------|------|
| 01 | plugin 骨架 | [01-plugin-skeleton.md](modules/01-plugin-skeleton.md) | DONE | — |
| 02 | skill: init | [02-skill-init.md](modules/02-skill-init.md) | DONE | 01 |
| 03 | skill: update | [03-skill-update.md](modules/03-skill-update.md) | DONE | 02 |
| 04 | skill: lint | [04-skill-lint.md](modules/04-skill-lint.md) | DONE | 02 |
| 05 | skill: ingest | [05-skill-ingest.md](modules/05-skill-ingest.md) | DONE | 02 |
| 06 | hook: SessionStart | [06-hook-session-start.md](modules/06-hook-session-start.md) | WONTFIX | 01 |
| 07 | hook: PostToolUse | [07-hook-post-tool-use.md](modules/07-hook-post-tool-use.md) | WONTFIX | 01 |
| 08 | CLAUDE.md 注入 | [08-claude-md-protocol.md](modules/08-claude-md-protocol.md) | DONE | 02 |
| 09 | OKF 合规校验 | [09-okf-conformance.md](modules/09-okf-conformance.md) | DONE | 02 |
| 10 | dogfood | [10-dogfood.md](modules/10-dogfood.md) | SUPERSEDED | 全部 |

## MVP 范围

v0.1 极简版（先验证核心价值）：
- ✅ init 操作（SKILL.md 指令式，CC 临场推理，无辅助脚本）
- ✅ update 操作（git diff 驱动，drift 自然报，stale concept 检测）
- ✅ lint 操作（融进 validate-okf.js，3 项检查）
- ✅ ingest 操作（零脚本，SKILL.md prompt + 明确规则分类）
- ✅ CLAUDE.md 协议段注入（5 条规则，Boy Scout Rule 降为 bonus）
- ✅ OKF 合规校验（10 项检查）
- ❌ hooks（WONTFIX，update + Boy Scout Rule 替代）

v0.2+ 按 modules/10-dogfood.md 的顺序迭代。

## 开发原则

- **断点开发**：每个模块可独立完成并验证，不一次性开发完
- **状态跟踪**：每个模块文档顶部有 `Status` 字段，完成改 `DONE`
- **TODO checklist**：每个模块文档底部有 TODO 列表，完成一项勾一项
- **Ponytail**：最小可用方案优先，辅助脚本只在 CC 临场推理不稳时才加
