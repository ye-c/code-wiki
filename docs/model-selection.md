# 模型选型调研：DeepSeek V4 Pro vs Qwen 3.7 Max

> 调研日期：2026-07-21
> 目的：决定 code-wiki 项目开发由哪个模型执行

## 调研方法

- Tavily 搜索社交媒体（Reddit、Hacker News、Medium、VentureBeat）
- 对比基准测试（SWE-bench Pro、LiveCodeBench、Artificial Analysis、Codeforces）
- 映射项目需求到模型能力

## 基准数据对比

| 维度 | DeepSeek V4 Pro | Qwen 3.7 Max | 胜出 |
|---|---|---|---|
| SWE-bench Pro | 55.4% | 60.6% | Qwen (+5.2) |
| LiveCodeBench | 93.5% (最高) | — | DeepSeek |
| Codeforces Rating | 3206 | — | DeepSeek |
| Artificial Analysis Coding | 75.9 | 74.1 | DeepSeek (+1.8) |
| Agentic Score | 74.5 | 69.7 | DeepSeek (+4.8) |
| Intelligence Index | 较低 | 较高 | Qwen |
| 综合排名 (AA) | #7 | #2 | Qwen |
| Output Speed | 62 tok/s | 204 tok/s | Qwen (3.3x) |
| Price /1M tok | $0.87 | $7.50 | DeepSeek (8.6x 便宜) |
| License | MIT 开源 | 闭源 | DeepSeek |
| Claude Code harness | 无原生支持 | 原生支持 | Qwen |
| 长会话执行 | 标准 | 35 小时自主 | Qwen |

## 社媒真实反馈

### DeepSeek V4 Pro

**正面**：
- HN: "as good or better than western SOTA for practical coding given an appropriate harness"
- HN: 用户抱怨"写代码太快，还没走开就写完了"（正面）
- Reddit r/DeepSeek (77 upvotes): "everyday coding 够用，gap 缩小"
- Reddit r/LocalLLaMA: "nearly on par with Sonnet 4.6"

**负面**：
- DeepSWE bench 只过 8%（争议，可能 harness 问题）
- r/opencodeCLI: 有人测试"turned out so bad for me"（个人体验差异）

### Qwen 3.7 Max

**正面**：
- VentureBeat: 35 小时自主连续执行，原生支持 Claude Code harness
- Reddit r/Qwen_AI (562 upvotes): "beats Opus 4.7 and GPT-5.5"
- Artificial Analysis 综合排名 #2
- r/LocalLLaMA: "non-hallucination rate SOTA"

**负面**：
- HN preview 阶段: "for coding it's really bad"（已过时，正式版已发布）
- Medium 实测: Agent Frontier 定位站得住，但 Python 实战仍逊 Opus 4.6/GPT-5.5

## 项目需求映射

code-wiki 核心技术需求：

| 需求 | 权重 | DeepSeek | Qwen |
|---|---|---|---|
| OKF spec 合规（精确遵循规范） | 高 | 中 | 高（Intelligence Index 高） |
| YAML frontmatter 解析 | 中 | 高 | 高 |
| 拓扑排序 + 循环检测 | 高 | 高（算法强） | 中高 |
| hook JS 脚本（Node.js） | 高 | 高 | 高 |
| SKILL.md 指令设计（元层次） | 高 | 中 | 高（Intelligence Index 高） |
| 长会话维护（init→dogfood→update） | 高 | 中 | 高（35h 自主） |
| Claude Code harness 兼容 | 高 | 低 | 高（原生支持） |

## 最终决策

### 主力执行者：Qwen 3.7 Max (`alicloud-sg/qwen3.7-max`)

**核心理由**：
1. **原生 Claude Code harness 兼容** — code-wiki 是 CC plugin，直接适配
2. **SWE-bench Pro 60.6% vs 55.4%** — 真实代码任务 Qwen 胜 5.2 个百分点
3. **Artificial Analysis 综合排名 #2 vs #7** — Intelligence Index 更高，SKILL.md 指令设计需要
4. **35 小时自主执行** — code-wiki 是长会话迭代项目
5. **速度 3.3x**（204 vs 62 tok/s）— 长项目迭代效率重要

### 备选：DeepSeek V4 Pro (`alicloud-sg/deepseek-v4-pro`)

**适用场景**：
- 模块 03（update）拓扑排序算法 — LiveCodeBench/Codeforces 优势
- 模块 09（OKF 校验）机械检查 — 成本敏感
- Qwen 限流时降级

### 不选 DeepSeek 主力的理由

- 算法竞赛强（LiveCodeBench 93.5%, Codeforces 3206）但本项目不是算法竞赛
- Agentic score 略高但 Qwen 正式版社媒反馈已翻盘
- 成本 8.6x 便宜但开发阶段 token 量有限，非决定因素
- 无 Claude Code harness 原生支持

## 执行计划

| 模块 | 执行模型 | 理由 |
|---|---|---|
| 01 plugin 骨架 | Qwen 3.7 Max | 结构化配置，需推理 |
| 02 skill init | Qwen 3.7 Max | 5 阶段流程，语义推理密集 |
| 03 skill update | DeepSeek V4 Pro（备选） | 拓扑排序算法 |
| 04 skill lint | Qwen 3.7 Max | 7 项检查，语义判断 |
| 05 skill ingest | Qwen 3.7 Max | LLM 理解对话内容 |
| 06 hook SessionStart | Qwen 3.7 Max | JS 脚本 + 状态栏 |
| 07 hook PostToolUse | Qwen 3.7 Max | JS 脚本 + drift 标记 |
| 08 CLAUDE.md 注入 | Qwen 3.7 Max | 协议段设计，元层次 |
| 09 OKF 合规校验 | DeepSeek V4 Pro（备选） | 机械检查，成本敏感 |
| 10 dogfood | Qwen 3.7 Max | 长会话验证 |

## 切换命令

```
/model alicloud-sg/qwen3.7-max       # 主力
/model alicloud-sg/deepseek-v4-pro   # 算法/成本场景备选
```

## 结论

**Qwen 3.7 Max 执行 code-wiki 开发**。DeepSeek V4 Pro 作为算法密集模块的备选。两者都没达到 Sonnet 4.6 级别，但 code-wiki 是工程项目不是前沿 AI 研究，Qwen 的 Agent Frontier 定位更匹配。
