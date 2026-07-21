# 01 - Plugin 骨架

> Status: **DONE**

## 目标

搭建 code-wiki plugin 的最小可加载骨架。完成后 plugin 能被 CC 识别、能 `/code-wiki` 触发（即使内部逻辑还没实现）。

## 范围

- `.claude-plugin/plugin.json` — plugin 清单
- `hooks/claude-codex-hooks.json` — hook 注册（空壳，hook 脚本 v0.2 才填）
- `skills/code-wiki/SKILL.md` — skill 定义（最小 description，body 先占位）
- `commands/code-wiki.toml` — `/code-wiki` 命令定义
- `README.md` — 项目说明
- `.gitignore` — 仓库自身 ignore

## 不在本模块

- hook 脚本实现（模块 06/07）
- skill 逻辑实现（模块 02-05）
- 辅助脚本（按需添加）

## 参考

- ponytail plugin: `~/.claude/plugins/cache/ponytail/ponytail/4.8.3/`
- ponytail plugin.json 结构
- ponytail commands/ponytail.toml 格式

## 交付物

### 1. `.claude-plugin/plugin.json`

参考 ponytail，最小字段：
```json
{
  "name": "code-wiki",
  "version": "0.1.0",
  "description": "Generate and maintain OKF-compliant code navigation wiki for any project.",
  "author": {
    "name": "chace.ye"
  },
  "hooks": "./hooks/claude-codex-hooks.json"
}
```

### 2. `hooks/claude-codex-hooks.json`

v0.1 空壳（hooks 指向的脚本可以不存在，或指向占位脚本）：
```json
{
  "hooks": {}
}
```

v0.2 填 SessionStart / PostToolUse（模块 06/07）。

### 3. `skills/code-wiki/SKILL.md`

最小 SKILL.md，body 先占位 TODO：
```markdown
---
name: code-wiki
description: Generate and maintain OKF-compliant code navigation wiki. Triggers on: map this codebase, generate wiki, create navigation map, document architecture, OKF wiki, code map, update wiki, lint wiki, sync wiki drift, ingest this.
argument-hint: "[init|update|lint|ingest]"
---

# code-wiki

TODO: 实现见 docs/modules/02-05
```

### 4. `commands/code-wiki.toml`

参考 ponytail/commands/ponytail.toml：
```toml
description = "Generate and maintain OKF-compliant code navigation wiki"
prompt = "Run code-wiki {{args}}. See skill code-wiki for full workflow."
```

### 5. `README.md`

最小 README：项目定位、安装方式、使用入口（指向 docs/）。

### 6. `.gitignore`

标准 Node/git ignore（即使 v0.1 没有 Node 依赖，先建好）。

## 验证

- [x] `code-wiki` 目录能被 CC 作为 plugin 加载（`/plugin` 能看到）
- [x] `/code-wiki` 命令能触发（即使返回 TODO 提示）
- [x] SKILL.md 的 description 能让 CC 在用户说"map this codebase"时路由到本 skill

## TODO

- [x] 写 `.claude-plugin/plugin.json`
- [x] 写 `hooks/claude-codex-hooks.json`（空壳）
- [x] 写 `skills/code-wiki/SKILL.md`（占位）
- [x] 写 `commands/code-wiki.toml`
- [x] 写 `README.md`
- [x] 写 `.gitignore`
- [ ] 本地加载验证（用户手动跑 `/plugin` 确认）
