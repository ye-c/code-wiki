# 决策记录 (P1-P10)

> ADR 式记录。每个决策：背景 → 决策 → 理由。

## P1: type 词汇表

**背景**：OKF §4.1 规定 `type` 是唯一硬约束字段，但不注册类型，生产者自定。需要决定 code-wiki 的 type 词汇表。

**决策**：7 个 type，分三层：
- 静态结构：Domain / Concept / Index
- 动态行为：Flow / StateMap
- 元层次：ADR / Convention

init 默认只用 4 个（Domain/Concept/Index/Convention），其余 3 个（Flow/ADR/StateMap）由用户/LLM 在维护中补。

**理由**：
- 5 个偏紧，8 个开始拥挤，7 个是甜点
- 静态/动态/元三轴各 2 个，对称
- StateMap 解决 git log 里高频痛点（状态/UI 联动改 5+ 次，无专门导航就是反复踩坑）
- 砍 Glossary（代码本身就是术语表）、Migration（太细）、Entry（可归 Concept）
- init 默认 4 个降低分类负担，符合 Karpathy "wiki 随时间变丰富"

## P2: body 生成深度

**背景**：init 时 body 该生成到什么程度？太厚维护成本爆炸，太薄 Agent 读不到关键信息。

**决策**：三档渐进：
- **薄**（init 默认）：frontmatter + Key Files + Dependencies + **段词表（Purpose 必选 + Usage/Relationships/Notes 按需 0-3 个）**
- **中**（lint 建议补）：+ Edge Cases（代码里硬编码的边界条件扫描）+ Gotchas（ingest 积累）
- **厚**（update 可选触发）：+ Change Prone + Performance Notes（实测数据）

**段词表**（4 个，LLM 按模块性质选 1-4 个）：
- `## Purpose`（必选）— 业务目的 / 为什么存在
- `## Usage`（可选）— 怎么用，不是怎么实现
- `## Relationships`（可选）— 连接关系 + 数据流 + 依赖
- `## Notes`（可选）— 边界 / 副作用 / 兜底

**LLM 按模块性质选段**：
- 策略/服务类 → Purpose + Usage + Relationships
- 工具函数 → Purpose + Usage
- 配置/常量 → Purpose + Notes
- 基础设施（cache/logger）→ Purpose + Notes
- 入口/编排 → Purpose + Relationships

**理由**：
- git log 证明 wiki 是高频维护资产，body 厚度直接决定维护成本
- 薄版本 init 后立即可用 — Agent 靠 frontmatter + Key Files + 段词表能导航
- Karpathy "LLM does all the grunt work" — init 时 LLM 还没开始 grunt work，强行生成 Gotchas/ADR 就是编
- 但 Purpose/Usage/Relationships/Notes 是 LLM 读代码能合理推断的（业务目的、公开接口、跨文件流、边界条件），不是编造
- Gotchas/ADR/Performance 留给 ingest，init 阶段标 `<!-- TODO: ingest -->` 占位
- 段名依据：Karpathy "summaries not just content"、RDD "how to use not how built"、pur4v "system relationships"、ADR "Context/Consequences"
- 段词表 4 个是甜点（对齐 P1 type 词汇表论点），固定段名保证一致性，LLM 按需选段防偷懒也防乱来

## P3: 阶段 2 介入程度

**背景**：init 的 PROPOSE 阶段（域划分草案）要不要强制人工确认？

**决策**：PROPOSE 阶段强制暂停等用户确认，其余阶段（AUTHOR/INDEX/VALIDATE）自动跑。无 `--interactive` flag。

**理由**：
- 域划分是不可逆成本最高的步骤（文件已写 = 删改代价）
- 草案阶段调整 = 改内存结构，零成本
- CC 里用户看到草案随时能喊停，强制暂停和"自动+报告"实际差异不大
- 但 (b) 已写文件，用户要改域划分得先删再重生 — 结构性决策值得用 (a)
- `--interactive` flag 是 YAGNI，默认强制暂停够用

## P4: 增量更新机制

**背景**：update 怎么处理代码变更？简单 git diff 会漏链接传播，全量重生成会覆盖用户手填内容。

**决策**：多部分组合：

1. **目录**：`.wiki/` 默认 + `.gitignore *`（默认本地用，删 .gitignore 可提交 git）
2. **触发**：用户主动跑 `/code-wiki update`（无 hook，无状态栏提示）
3. **处理**：git diff + reverse map 找 owner concept + 重生成结构化段
4. **stale concept 检测**：resource 路径不存在 → 记 log，不自动删
5. **lint 兜底**：扫 review 标记（触发源是 Boy Scout Rule，非 hook）
6. **drift 自然报**：update Phase 1 跑 git diff 时自然发现并报告

**理由**：
- `.wiki/` + `.gitignore *` — 用户选择，init 时告知如何切换共享模式
- 无 hook（P10 决策）— drift 检测融进 update，零 LLM 主动性依赖
- reverse map 驱动 — 不依赖 hooks，git diff 是唯一变更来源
- stale concept 不自动删 — 删不可逆，记 log 提示用户手动复查
- 按用户主动触发 — 不按时间/变更量自动打断，用户自己判断何时清

## P5: skill 名字

**背景**：skill 叫什么？

**决策**：`code-wiki`。description 字段补维护语义。

**理由**：
- 最简洁，用户一眼懂
- 不绑死 OKF，不绑死维护模式
- description 补语义：`Generate and maintain OKF-compliant code navigation wiki.`
- 别名（wiki-keeper/okf-wiki/cartograph）要么古怪要么太花，不如 code-wiki 实在

## P6: 操作范围

**背景**：支持哪些操作？Karpathy 三操作（Ingest/Query/Lint）+ OpenWiki 的 update。

**决策**：四操作 — init/update/lint/ingest。不做主动 query。

**理由**：
- query 是 CC 本职工作，skill 越界做 query 会和 CC 检索/对话流冲突
- 但"好答案归档成新页"是 Karpathy 复利关键，不能丢 — 用 ingest 保留
- ingest 是用户显式触发（"归档这个"或 `/code-wiki ingest`），避免 skill 变成"每次对话都问要不要归档"的噪音
- 用 `ingest` 而非 `archive`/`mark`/`meme` — 对齐 Karpathy 原词，语义最准（消化吸收，非冷冻归档）

## P7: CLAUDE.md 自动注入

**背景**：Karpathy 第三层（schema 层）是 wiki 价值的关键。没有它，wiki 是死文件。

**决策**：默认自动追加 CLAUDE.md 协议段（5 条规则），检测已有则更新不重复，init 输出告知如何跳过。无 flag。

**5 条规则**：
1. Read `.wiki/index.md` first
2. Load domain map
3. Follow dependencies
4. Dynamic Addressing（不信任 line number）
5. Boy Scout Rule（drift 时顺手更新）

**理由**：
- 默认自动追加降低摩擦，wiki 立即生效
- 检测已有协议段避免重复追加（重新 init 场景）
- CLAUDE.md 的 git 行为由用户现有策略决定，skill 不干预
- flag 是 YAGNI — 用户想跳过自己删段

## P8: log.md

**背景**：OKF §7 允许 log.md，Karpathy 强调 log.md 的 grep 可解析价值。但之前考虑过不加。

**决策**：加根 `.wiki/log.md`，记 init/update/lint/ingest 四操作事件。格式对齐 OKF §7 + Karpathy grep 可解析。不建 per-scope log.md。

**格式**：
```markdown
## 2026-07-20
* **init**: Generated initial wiki. 5 domains, 19 concepts. sync_commit=`a0feac69`.
* **ingest**: Added `engine/discuss-flow.md` (type: Flow).
```

**理由**：
- sync_commit 只给 hook 读，人/CC 查 wiki 演进要靠 log.md
- log.md 记 wiki 层面操作，和 git log（代码变更）分工不重叠
- 不记每次小改（git log 的事），不记 CC 顺手更新（太碎）
- per-scope log.md 是 YAGNI，根级够用

## P9: Personal Mode

**背景**：OpenWiki 有 Code Mode + Personal Mode。要不要做 Personal Mode？

**决策**：v1 严格 code-only，不对接外部服务，不扫非代码目录。留扩展点。

**理由**：
- skill 叫 `code-wiki`，Personal Mode 是 "life wiki"，混在一起名字撒谎
- Personal Mode 要对接 Gmail/Notion/X，每个都是独立集成，依赖爆炸
- type 词汇表 7 个全是代码专用，Personal Mode 要 Entity/Topic 等另一套
- git log 显示高频痛点都在代码导航，Personal Mode 不是真实痛点
- 留扩展点：type 词汇表可扩、DISCOVER 可配置、未来可派生 life-wiki/research-wiki skill

## P10: 砍 hooks，drift 检测融进 update

**背景**：06/07 hooks 性能拖累 + YAGNI（git diff 已覆盖 drift 检测）。原方案让 LLM 会话开始跑 git rev-list 报 drift（CLAUDE.md 规则 6），但过度依赖 LLM 主动性，低级模型会静默跳过。

**决策**：砍 06/07。drift 检测改两条路径：
1. **update Phase 1** 跑 git diff 时自然发现并报告（用户主动触发，确定性）
2. **Boy Scout Rule**（CLAUDE.md 协议段第 5 条，锦上添花，非核心）

**CLAUDE.md 协议段不加第 6 条**。drift 检测放 update 里，不靠 LLM 主动性。

**理由**：
- 零 JS hook，零 hook 注册，复用 CC 已有工具调用
- update 是确定性触发，不靠 LLM 记得跑命令
- 低级模型也能跑 update（就是跑 git 命令 + 解析输出）
- Boy Scout Rule 是 bonus，不是 load-bearing — 核心流程不依赖 LLM 主动性
- 机械操作（drift 检测、lint 检查）脚本化或 git 命令化，不靠 LLM 主动性
- 语义操作（域划分、分类、生成 markdown）LLM 化，但给明确规则降低模型能力要求

## P11: init AUTHOR 阶段原生并行（subagent per domain）

**背景**：串行 init 在大项目（>10 万行）上 AUTHOR 阶段 context 必爆。DISCOVER 扫目录轻量，但 AUTHOR 要为每个 concept 读源码推断 Purpose/Usage/Relationships，累计输入 token 远超单窗口。实测 claude-bro（103 万行）串行 init 不可行。

**决策**：AUTHOR 阶段改为原生并行——每（子）域一个 subagent，Agent tool 单消息多调用并行。主线程只做 DISCOVER/PROPOSE/INDEX/VALIDATE/Finalize，不读源码。

**关键设计**：
1. **无 flag**：不判断项目大小，统一并行。小项目 1-3 个 subagent，spawn 成本秒级，可接受。判断逻辑甩给用户不合理（用户不知道项目多大要并行）。
2. **超大域按子目录切子域**：阈值 >200 files 或 >50k lines。递归切直到每（子）域在阈值内。主线程 PROPOSE 阶段就切好，不等 subagent 自己爆。
3. **subagent prompt 自包含**：subagent 看不到主对话和 SKILL.md，prompt 必须带域路径、concept 列表、AUTHOR 规则、段词表、frontmatter 模板、domain index 模板。
4. **subagent 直接 Write 到磁盘**：不返回内容给主线程，避免主线程 context 被撑爆（这本来就是并行的初衷）。
5. **TaskCreate 强制并行**：PROPOSE 阶段每（子）域建一个 task，Phase 3 每 task 派一个 subagent。不建 task = 无法并行 = INDEX 阶段发现 domain index 缺失 = 报错。流程自强制，不靠 LLM 自觉。
6. **codegraph 不硬编码**：subagent prompt 提"有 code intelligence MCP 工具优先用"，但不强制。装了 codegraph 的项目 subagent 大概率主动用，没装退回 grep，graceful degradation 不破坏零依赖原则。

**不做的事**：
- 无 retry 逻辑（subagent 挂了 INDEX 阶段发现 domain index 缺失，报错让用户重跑那个域）
- 无 `--parallel` flag（统一并行，不判断）
- 无 subagent 间依赖管理（concept 跨域引用靠 codegraph 或 grep，不靠 subagent 间通信）

**理由**：
- context 隔离是 subagent 核心价值——每个 agent 只装一个域的源码，主线程只汇总
- Agent tool 是 CC 原生能力，不引入新依赖，不破坏"零新增依赖"原则（P0）
- 超大域切分是唯一真设计决策，其余是实现细节
- update 不需要并行（git diff 只读变更文件，增量语义决定不爆）
- 串行 init 在小项目也能跑，但统一并行消除"何时该并行"的判断负担
