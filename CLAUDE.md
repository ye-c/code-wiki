# code-wiki 开发说明

你在 code-wiki 仓库工作：~/code/code-wiki

code-wiki 是 Claude Code plugin，为任意项目生成 OKF v0.1 合规代码导航 wiki。

## 开发计划

先读文档：
- docs/README.md — 模块导航
- docs/architecture.md — 三层架构 + 四操作 + 数据流
- docs/decisions.md — P1-P9 ADR
- docs/modules/01-plugin-skeleton.md — DONE（骨架已就位）
- docs/modules/02-skill-init.md — init 操作
- docs/modules/03-skill-update.md — update 操作
- docs/modules/04-skill-lint.md — lint 操作
- docs/modules/05-skill-ingest.md — ingest 操作
- docs/modules/06-hook-session-start.md — SessionStart hook
- docs/modules/07-hook-post-tool-use.md — PostToolUse hook
- docs/modules/08-claude-md-protocol.md — CLAUDE.md 注入
- docs/modules/09-okf-conformance.md — DONE（validate-okf.js 已就位）
- docs/modules/10-dogfood.md — dogfood 验证

## 已完成

- Module 01 (plugin 骨架): DONE — .claude-plugin/plugin.json, hooks/, skills/code-wiki/SKILL.md (占位), commands/code-wiki.toml, README.md, .gitignore
- Module 02 (skill init): DONE — SKILL.md init 六阶段（DISCOVER→PROPOSE→AUTHOR→INDEX→VALIDATE→Finalize），PROPOSE 不暂停
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

## 验证流程

fixture 项目：`~/code/ragnarok`（Python 量化交易系统，80 .py 文件，4 域候选：app/rag/bin/serv，已有 CLAUDE.md — 测"已有协议段"注入分支）

```bash
source ~/.zshrc 2>/dev/null; cd ~/code/ragnarok && \
  rm -rf .wiki && \
  cc --plugin-dir ~/code/code-wiki -p '/code-wiki init' < /dev/null && \
  node ~/code/code-wiki/scripts/validate-okf.js .wiki && \
  grep -q '## 🤖 Code Wiki Retrieval Protocol' CLAUDE.md
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
