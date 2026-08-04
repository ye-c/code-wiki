# 整体架构设计

## 背景

### 问题

AI 编码助手在大型项目里频繁扫描代码、浪费上下文、消耗 token、文档容易过时。根本原因是**知识没有被整理成机器能稳定使用的形态**（Karpathy 称之为 "context assembly" 问题）。

### 三个思想来源

| 来源 | 贡献 |
|------|------|
| **OKF v0.1** (Google, 2026-06) | 格式规范：markdown + YAML frontmatter + `type` 字段，vendor-neutral |
| **Karpathy LLM Wiki** | 维护模式：wiki 是持续累积的资产，LLM 做 grunt work，人做 sourcing |
| **OpenWiki** (LangChain, 2026-07) | 产品形态：git diff 增量更新 + CLAUDE.md schema 注入 |

### 差异化

1. **OKF 合规** — 可被其他 OKF 消费者读取，不绑死本工具
2. **代码导航专用 `type` 词汇表** — 7 个 type 覆盖静态/动态/元层次
3. **skill 原生** — 零新增依赖，复用 CC 现有工具链

## 三层架构

对齐 Karpathy 三层模型，适配到代码导航场景：

```
┌─────────────────────────────────────────────────┐
│  Schema 层 (CLAUDE.md)                          │
│  - 告诉 CC 怎么读 wiki                           │
│  - 5 条检索协议规则                              │
│  - init 时自动注入                              │
├─────────────────────────────────────────────────┤
│  Wiki 层 (.wiki/)                               │
│  - OKF 合规的 markdown 文件                     │
│  - 7 个 type: Domain/Concept/Index/ADR/         │
│    Flow/Convention/StateMap                    │
│  - index.md + log.md + domain/concept.md       │
│  - sync_commit 字段跟踪代码状态                 │
├─────────────────────────────────────────────────┤
│  Raw sources 层 (项目代码)                      │
│  - src/ lib/ app/ cmd/ 等                       │
│  - 不可变（wiki 引用，不修改）                  │
└─────────────────────────────────────────────────┘
```

## 四操作

对齐 Karpathy 三操作（Ingest/Query/Lint）+ OpenWiki 的 update，去掉主动 query（交给 CC 本职）：

| 操作 | 触发 | 干什么 | 对齐 |
|------|------|--------|------|
| **init** | 用户显式 | 初始生成 wiki（5 阶段） | OpenWiki init |
| **update** | 手动 + hook 提示 | git diff + 链接传播 + 级联修正 | OpenWiki update |
| **lint** | 用户显式 | 健康检查（断链/孤儿页/stale） | Karpathy lint |
| **ingest** | 用户显式 | 对话产物归档成新页 | Karpathy ingest |

**不做主动 query** — 通过 CLAUDE.md 协议段让 CC 在每次对话时自动读 wiki，不提供 `/code-wiki query` 命令。

## type 词汇表（7 个）

| type | 层次 | 用途 | init 默认 |
|------|------|------|-----------|
| **Domain** | 静态 | 域导航图 | ✅ |
| **Concept** | 静态 | 子系统说明（兜底） | ✅ |
| **Index** | 静态 | 根索引（OKF 保留名） | ✅ |
| **Convention** | 元 | 项目级规范 + edge case | ✅ |
| **Flow** | 动态 | 跨层执行路径 | 维护中补 |
| **ADR** | 元 | 架构决策记录 | 维护中补 |
| **StateMap** | 动态 | 状态/UI/env var 跨层映射 | 维护中补 |

**init 默认只用 4 个**（Domain/Concept/Index/Convention），其余 3 个由用户/LLM 在维护中补。符合 Karpathy "wiki 随时间变丰富"理念。

## 项目结构

```
code-wiki/                        # 本 plugin 仓库
├── .claude-plugin/
│   └── plugin.json               # plugin 清单
├── skills/
│   └── code-wiki/
│       └── SKILL.md              # skill 指令（init/update/lint/ingest）
├── commands/                     # 4 个 slash 命令（init/update/lint/ingest）
│   ├── init.md
│   ├── update.md
│   ├── lint.md
│   └── ingest.md
├── scripts/                      # 辅助脚本（validate-okf.js）
├── docs/                         # 开发文档
└── README.md
```

**无 hooks 目录**（P10 决策，砍 06/07）。

## .wiki/ 目标结构（用户项目里生成的）

```
user-project/
├── .wiki/
│   ├── .gitignore                # 内容: *  （默认忽略，删掉即可提交）
│   ├── index.md                  # 根索引（frontmatter: okf_version + sync_commit）
│   ├── log.md                    # 操作历史（OKF §7 格式）
│   └── <domain>/
│       ├── <concept>.md
│       └── ...
└── CLAUDE.md                     # 注入了 Code Wiki Retrieval Protocol
```

## 数据流

### init 流程

```
用户: /code-wiki:init
  ↓
DISCOVER  — 扫描 manifest + 目录结构，识别域边界
  ↓
PROPOSE   — 生成域划分草案（不写文件），立即继续，不暂停
  ↓
AUTHOR    — 为每个域 + concept 生成 .md（薄 body）
  ↓
INDEX     — 生成 index.md（OKF §6 + frontmatter）
  ↓
VALIDATE  — OKF 合规校验 + 断链扫描
  ↓
[注入 CLAUDE.md 协议段]
  ↓
[初始化 .wiki/log.md]
  ↓
[设置 .wiki/.gitignore *]
  ↓
[输出: 如何切换共享模式]
```

### update 流程

```
用户: /code-wiki:update
  ↓
Phase 1 DETECT: git diff sync_commit..HEAD --name-only → 变更代码文件
  ↓
（自然报 drift: "wiki N commits behind"）
  ↓
Phase 2 REGENERATE: 找 owner concept（frontmatter resource 反查）
  ↓
更新 owner concept 的 frontmatter + Key Files + Dependencies
  ↓
stale concept 检测（resource 路径不存在 → 记 log）
  ↓
Phase 3 VALIDATE: 跑 validate-okf.js
  ↓
刷 index.md sync_commit
  ↓
追加 log.md
```

**无 hook**（P10 决策）。drift 检测融进 update Phase 1，零 LLM 主动性依赖。

### lint 流程

```
用户: /code-wiki:lint
  ↓
扫描断链 / 孤儿页 / stale concept / sync_commit drift / 缺失页 / type 合规
  ↓
输出报告（不自动修）
  ↓
[用户确认后批量修]
```

### ingest 流程

```
用户对话产生有价值内容
  ↓
用户: "归档这个" 或 /code-wiki:ingest
  ↓
读最近 assistant 回复
  ↓
判断内容类型 → 对应 type（Flow/ADR/StateMap/Convention）
  ↓
生成 frontmatter + 薄 body
  ↓
放到对应 domain 目录
  ↓
更新 index.md + log.md
```

## 标记生命周期（drift → review → 清除）

```
用户改代码（git commit）
  → update Phase 1 git diff 自然发现 drift
  → update Phase 2 重生成结构化段
  → freeform 段 review 标记由 Boy Scout Rule 触发（LLM 改代码时顺手加，bonus）
  → lint 扫 review 标记（保留检查，但不再依赖 hook）
  → 用户复查完，手动删 review 标记
```

**drift 不积压**：用户主动跑 update 时被消。review 标记是 bonus，不是 load-bearing。

## 和现有工具的协同

| 工具 | 关系 |
|------|------|
| `codebase-memory` MCP | 可选加速器，DISCOVER 阶段可调 `get_architecture`，非依赖 |
| `plan-with-me` skill | 互补 — plan-with-me 管过程，code-wiki 管产出 |
| `commit-haiku` skill | 生成完可顺手 commit |
| CC 本身 | query 由 CC 通过 CLAUDE.md 协议自动做，skill 不越界 |

## 设计原则

1. **OKF 合规优先** — 硬约束（frontmatter + type）必须满足，软差距（绝对路径/log.md）按需
2. **人机分工** — 结构化段（frontmatter/Key Files/Dependencies）LLM 管，freeform body 人管
3. **断点开发** — 每个模块可独立交付并验证
4. **Ponytail** — 辅助脚本只在 CC 临场推理不稳时才加，否则纯 SKILL.md 指令
5. **零新增依赖** — 不引入外部 npm 包，复用 CC 现有工具链。frontmatter 限制为 JSON-flow YAML 子集（标量/列表/简单 map），手写解析器，不引入 `js-yaml`
