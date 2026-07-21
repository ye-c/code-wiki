# 07 - Hook: PostToolUse

> Status: **TODO**
> 依赖: 01

## 目标

用户改代码时（Edit/Write 工具后触发），静默标记受影响的 wiki concept。

## 触发

CC PostToolUse 事件，matcher 限定 Edit/Write 工具。

参考 ponytail 的 hook 注册格式：
```json
{
  "matcher": "Edit|Write",
  "hooks": [...]
}
```

## 流程

```
1. 读 hook 输入（哪个文件被编辑）
2. 检查 .wiki/ 是否存在
3. 扫所有 wiki concept 的 frontmatter resource 字段
4. 找出 resource 匹配被编辑文件的 concept
5. 给这些 concept 加 drift 标记
6. 写到 .wiki/.drift.json
```

## 输入

PostToolUse hook 输入（stdin JSON）包含：
- `tool_name`: "Edit" / "Write"
- `tool_input.file_path`: 被编辑的文件路径

## 输出

更新 `.wiki/.drift.json`（模块 03 读）：
```json
{
  "concepts": [
    {
      "id": "core/repl",
      "file": "core/repl.md",
      "resource": "src/screens/REPL.tsx",
      "marked_at": "2026-07-20T..."
    }
  ],
  "last_updated": "2026-07-20T..."
}
```

## 匹配逻辑

被编辑文件路径 vs concept 的 `resource` 字段：

| resource 类型 | 匹配规则 |
|--------------|---------|
| 单文件（`src/foo.ts`） | 精确匹配 |
| 目录（`src/services/`） | 前缀匹配（被编辑文件在该目录下） |
| 无 resource 字段 | 跳过（该 concept 不绑定代码） |

## 边界情况

- 被编辑文件是 wiki 文件本身（`.wiki/**/*.md`） → 跳过（不是代码变更）
- 被编辑文件无对应 concept → 静默跳过（可能该文件不需要 wiki 页）
- `.wiki/` 不存在 → 静默退出
- hook 出错 → silent fail

## 关键决策

- **静默标记**（P4）— 不弹 UI，不打断改代码流
- **只标记不修正**（P4）— 修正交给 update
- **resource 目录前缀匹配** — 目录下任何文件变更都触发该 concept
- **silent fail**（参考 ponytail）

## 实现参考

ponytail 的 `ponytail-mode-tracker.js`（UserPromptSubmit）：
- 读 stdin
- JSON.parse
- 处理
- 写 flag 文件
- 全程 try/catch silent fail

文件位置：`hooks/wiki-post-tool-use.js`

## hook 注册约定

参考 ponytail 的 `hooks/claude-codex-hooks.json`：
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/wiki-post-tool-use.js\"; exit 0",
            "timeout": 5
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

- [ ] 编辑 src/screens/REPL.tsx，`.wiki/.drift.json` 出现 core/repl
- [ ] 编辑 src/services/api/ 下任何文件，`.wiki/.drift.json` 出现 services/api
- [ ] 编辑 .wiki/ 下的 md 文件，不触发 drift
- [ ] 编辑无对应 concept 的文件，静默跳过
- [ ] hook 出错时 silent fail

## TODO

- [ ] 写 `hooks/wiki-post-tool-use.js`
- [ ] 在 `hooks/claude-codex-hooks.json` 注册 PostToolUse hook
- [ ] 定义 `.wiki/.drift.json` 格式
- [ ] 实现 resource 匹配逻辑（精确 + 目录前缀）
- [ ] 实现静默标记
- [ ] dogfood 验证
