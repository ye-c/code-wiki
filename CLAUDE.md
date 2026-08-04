# code-wiki 开发说明

你在 code-wiki 仓库工作：~/code/code-wiki

code-wiki 是 Claude Code plugin，为任意项目生成 OKF v0.1 合规代码导航 wiki。

## 开发计划

先读文档：
- docs/README.md — 模块导航
- docs/architecture.md — 三层架构 + 四操作 + 数据流
- docs/decisions.md — P1-P9 ADR
- docs/modules/01-plugin-skeleton.md — DONE（骨架已就位）
- docs/modules/02-skill-init.md — DONE（init 六阶段已就位）
- docs/modules/03-skill-update.md — DONE（update 三阶段已就位）
- docs/modules/04-skill-lint.md — lint 操作
- docs/modules/05-skill-ingest.md — DONE（ingest 六步骤，填充 TODO 占位，Task 规划）
- docs/modules/06-hook-session-start.md — SessionStart hook
- docs/modules/07-hook-post-tool-use.md — PostToolUse hook
- docs/modules/08-claude-md-protocol.md — DONE（CLAUDE.md 注入）
- docs/modules/09-okf-conformance.md — DONE（validate-okf.js 已就位）
- docs/modules/10-dogfood.md — dogfood 验证

## 已完成

- Module 01 (plugin 骨架): DONE — .claude-plugin/plugin.json, hooks/, skills/code-wiki/SKILL.md (占位), commands/code-wiki.toml, README.md, .gitignore
- Module 02 (skill init): DONE — SKILL.md init 六阶段（DISCOVER→PROPOSE→AUTHOR→INDEX→VALIDATE→Finalize），PROPOSE 不暂停，段词表 4 段，Task 规划
- Module 03 (skill update): DONE — SKILL.md update 三阶段（DETECT→REGENERATE→VALIDATE），不依赖 hooks，git diff 驱动，重生成段词表 4 段，Task 规划
- Module 08 (CLAUDE.md 注入): DONE — 三分支检测（无/有/已有协议段），5 条规则，`@.wiki/index.md`
- Module 09 (OKF 校验): DONE — scripts/validate-okf.js (手写 YAML 解析器 + 8 项检查 + 自检 fixture)
- 文档补丁已应用: B1 (PROPOSE 去强制暂停), B2 (JSON-flow YAML 子集), B3 (ingest 措辞), D2 (drift 文件合并), 06/07 hook 约定

## 关键约束

- 零依赖（手写解析器，不引入 js-yaml）
- frontmatter JSON-flow YAML 子集（标量/列表/简单 map，不支持多行字符串/anchors/tags）
- PROPOSE 阶段输出草案后立即继续 AUTHOR，不暂停（用户事后调整域划分）
- init 默认 .wiki/.gitignore *（本地优先，团队共享用户自己删 .gitignore）
- CLAUDE.md 注入三分支：无 CLAUDE.md / 有无协议段 / 已有协议段
- 协议段 heading 必须是 `## 🤖 Code Wiki Retrieval Protocol`（带 emoji）
- 协议段首行 `@.wiki/index.md`
- **段词表 4 段**（P2）：Purpose（必选）+ Usage/Relationships/Notes（按需 0-3 个），LLM 按模块性质选段
- **Task 规划**：所有操作使用 TaskCreate/TaskUpdate 分阶段追踪，防止阶段跳过
- **ingest 填充占位**：Gotchas/ADR/Performance 内容优先填充 init 阶段的 `<!-- TODO: ingest -->` 占位

## 验证流程

fixture 项目：`~/code/project_fastrtc`，注意 Bash 必须执行 `source` 后，才能运行 `cc` 命令。

```bash
source $HOME/.zshrc 2>/dev/null; cd $HOME/code/project_fastrtc && \
  cc --plugin-dir $HOME/code/code-wiki -p '/code-wiki:init' < /dev/null && \
  node $HOME/code/code-wiki/scripts/validate-okf.js .wiki && \
  grep -q '## 🤖 Code Wiki Retrieval Protocol' CLAUDE.md
```

```bash
source $HOME/.zshrc 2>/dev/null; cd $HOME/code/project_fastrtc && \
  echo "# drift test" > drift_probe.py && \
  cc --plugin-dir $HOME/code/code-wiki -p '/code-wiki:update' < /dev/null && \
  node $HOME/code/code-wiki/scripts/validate-okf.js .wiki && \
  grep -q "drift_probe" .wiki/log.md
```

## 排查路径

- init 没写文件 → SKILL.md 非交互分支没处理
- validate 报错 → frontmatter 不符合 JSON-flow YAML 子集
- CLAUDE.md 没注入 → 三分支检测漏了
- grep 不命中 → heading 文本不对（检查 emoji）
- 域划分过粗/过细 → DISCOVER 启发式阈值需调（目录文件数 / 约定名优先级）

## 开发原则

- Ponytail：最小可用方案优先，辅助脚本只在 CC 临场推理不稳时才加
- 断点开发：每个模块独立完成并验证
- 状态跟踪：模块文档顶部 Status 字段，完成改 DONE，底部 TODO 勾选
