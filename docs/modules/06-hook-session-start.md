# 06 - Hook: SessionStart

> Status: **TODO**
> 依赖: 01

## 目标

CC 启动时检测 `.wiki/index.md` 的 `sync_commit` vs `git HEAD`，drift 则状态栏提示。

对齐 ponytail 的 SessionStart hook 模式（ponytail-activate.js）。

## 触发

CC SessionStart 事件（startup/resume/clear/compact）。

参考 ponytail 的 matcher：
```json
{
  "matcher": "startup|resume|clear|compact",
  "hooks": [...]
}
```

## 流程

```
1. 检查 .wiki/index.md 是否存在
2. 读 frontmatter 的 sync_commit 字段
3. 跑 git rev-parse HEAD
4. 跑 git rev-list --count sync_commit..HEAD 拿 commits_behind
5. 状态栏显示 "wiki: N commits behind"
```

**不写 flag 文件**（D2 修订）— SessionStart 现算，无状态。PostToolUse 的 `.wiki/.drift.json` 是唯一 drift 状态来源，update 读它。

## 输出

### 状态栏

参考 ponytail 的 statusline 机制。显示：
- 无 drift：不显示（或显示 `wiki: ✓`）
- 1-5 commits behind：`wiki: N behind`（白色）
- 5-15 commits behind：`wiki: N behind (建议更新)`（黄色）
- 15+ commits behind：`wiki: N behind (必须更新)`（红色）

## 边界情况

- 无 `.wiki/index.md` → 静默退出（项目还没 init）
- 无 git 仓库 → 静默退出
- `sync_commit` 字段缺失 → 静默退出（wiki 损坏）
- git 命令失败 → silent fail（参考 ponytail）

## 关键决策

- **静默检测**（P4）— 不弹 UI，不打断流
- **状态栏提示**（P4）— drift 可见性，不强制 update
- **按变更量分级提示**（P4）— 1-5 / 5-15 / 15+
- **silent fail**（参考 ponytail）— hook 出错不阻塞 CC

## 实现参考

ponytail 的 `ponytail-activate.js`（SessionStart）：
- 读 stdin（JSON）
- 处理
- 状态栏输出
- 全程 try/catch silent fail

文件位置：`hooks/wiki-session-start.js`

## hook 注册约定

参考 ponytail 的 `hooks/claude-codex-hooks.json`：
```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/wiki-session-start.js\"; exit 0",
            "timeout": 5,
            "statusMessage": "Checking wiki drift..."
          }
        ]
      }
    ]
  }
}
```

**关键约定**：
- `${CLAUDE_PLUGIN_ROOT}` — CC 注入的 plugin 根路径环境变量
- `; exit 0` — silent fail，hook 出错不阻塞 CC

## 验证

- [ ] 项目无 .wiki/ 时，hook 静默退出
- [ ] 项目有 .wiki/ 且 sync_commit = HEAD 时，不显示 drift
- [ ] 项目有 .wiki/ 且 sync_commit ≠ HEAD 时，状态栏显示 "wiki: N behind"
- [ ] 分级提示正确（1-5 / 5-15 / 15+）
- [ ] hook 出错时 silent fail，不阻塞 CC
- [ ] 不写 flag 文件（D2 修订），SessionStart 现算 commits_behind

## TODO

- [ ] 写 `hooks/wiki-session-start.js`
- [ ] 在 `hooks/claude-codex-hooks.json` 注册 SessionStart hook
- [ ] 实现 git rev-list 现算 commits_behind（无 flag 文件）
- [ ] 实现状态栏显示逻辑（参考 ponytail-statusline）
- [ ] 实现分级提示
- [ ] dogfood 验证
