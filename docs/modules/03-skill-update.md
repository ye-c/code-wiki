# 03 - Skill: update 操作

> Status: **TODO**
> 依赖: 02, 06, 07

## 目标

实现 `/code-wiki update` — git diff 驱动增量更新，处理链接传播和交叉引用。

## 前置依赖

- 模块 06（SessionStart hook）— 检测 drift
- 模块 07（PostToolUse hook）— 标记 drift concept

## 流程

```
1. 读 drift 标记（hook 写的 flag 文件）
2. git diff sync_commit..HEAD --name-only → 变更代码文件
3. 找 owner concept（frontmatter resource 反查）
4. 更新 owner concept 的 frontmatter + Key Files
5. 拓扑排序所有 drift concept（处理交叉引用）
6. 级联修正：同步结构化段，freeform 段加 review 标记，清 drift
7. 刷 index.md sync_commit
8. 追加 log.md
```

## 详细步骤

### 1. 读 drift 标记

PostToolUse hook 把 drift concept 写到 `.wiki/.drift.json`（唯一 drift 状态来源，SessionStart 不写文件）：
```json
{
  "concepts": ["core/repl", "engine/context"],
  "last_updated": "2026-07-20T..."
}
```

update 读取这个文件，知道哪些 concept 需要处理。

### 2. git diff 拿变更文件

```bash
git diff <sync_commit>..HEAD --name-only
```

输出变更的代码文件列表。

### 3. 找 owner concept

扫所有 `.wiki/**/*.md` 的 frontmatter `resource` 字段，反查每个变更文件属于哪个 concept。

**边界情况**：
- 一个代码文件对应多个 concept → 都更新
- 一个代码文件无对应 concept → 提示"这个文件没 wiki 页，要不要新建？"
- concept 的 `resource` 是目录 → 目录下任何文件变更都触发

### 4. 更新 owner concept

**只更新结构化段**：
- frontmatter 的 `timestamp`
- `# Key Files` 段（重新从代码抽）
- `# Dependencies` 段（重新从 import 抽）

**不动 freeform 段**：
- `# Architecture`
- `# Gotchas`
- 用户手填的任何内容

### 5. 拓扑排序

把所有 drift concept 建图（A 引用 B = A 依赖 B）。

**拓扑排序规则**：
- 先处理叶子（无下游依赖的）
- 再处理上游
- 每个页面只处理一次

**循环引用处理**：
- 检测 A↔B 互相 drift
- 合并成一个"变更组"一起处理
- 不无限传播

### 6. 级联修正

对每个 drift concept 的下游页面：

1. **重读上游 concept** 的 frontmatter + Key Files
2. **同步本页 Dependencies 段**（结构化，自动改）
3. **freeform 段不动**，但在段尾加子标记：
   ```html
   <!-- review: upstream <concept> changed at <commit> -->
   ```
4. **清顶层 drift 标记**

### 7. 刷 index.md

更新 frontmatter 的 `sync_commit` 到当前 HEAD。

### 8. 追加 log.md

```markdown
## <today>
* **update**: Synced N concepts after commits <short>..<short>. Cleared N drift marks.
```

## 关键决策

- **机器管结构化段，人管 freeform**（P4）— update 不动 freeform body
- **drift 标记闭环**（P4 修订）— update 清 drift 加 review，lint 推 review 到用户
- **拓扑排序批处理**（P4）— 交叉引用不循环传播
- **按变更量而非时间触发**（P4）— 1-5 攒着，5-15 建议清，15+ 必须清

## 辅助脚本

`scripts/update-wiki.js`（建议）：
- 读 drift flag
- 跑 git diff
- 扫 frontmatter 反查
- 拓扑排序
- 批量更新结构化段

**理由**：update 逻辑复杂（拓扑排序、循环检测），CC 临场推理不稳，建议脚本化。

## 验证

- [ ] 改一个文件，跑 update，对应 concept 的 timestamp 更新
- [ ] 改一个被多页引用的文件，所有下游页加 review 标记
- [ ] 改 5 个交叉引用的文件，拓扑排序正确，无无限传播
- [ ] update 后 drift flag 清空
- [ ] index.md sync_commit 更新到 HEAD
- [ ] log.md 有 update 记录

## TODO

- [ ] 定义 drift flag 文件格式（`.wiki/.drift.json`）
- [ ] 写 update 流程指令（SKILL.md）
- [ ] 写 git diff + frontmatter 反查逻辑
- [ ] 写拓扑排序 + 循环检测逻辑
- [ ] 写级联修正逻辑（同步结构化段 + 加 review 标记）
- [ ] 写刷 sync_commit + 追加 log.md 逻辑
- [ ] 可选：写 `scripts/update-wiki.js` 辅助脚本
- [ ] dogfood 验证（claude-bro 改几个文件跑 update）
