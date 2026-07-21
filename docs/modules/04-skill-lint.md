# 04 - Skill: lint 操作

> Status: **TODO**
> 依赖: 02

## 目标

实现 `/code-wiki lint` — wiki 健康检查，输出报告（不自动修）。

对齐 Karpathy lint 操作：
> Look for: contradictions between pages, stale claims, orphan pages, missing cross-references, data gaps.

## 检查项

### 1. 断链扫描

扫所有 wiki 页的 markdown 链接，检查目标是否存在。

**OKF §5.3 规定**：断链不是 malformed，可能代表"还没写的知识"。所以**警告非错误**。

输出：
```
⚠ Broken links (3):
  - core/repl.md → /engine/context.md (target exists ✓)
  - core/repl.md → /services/foo.md (target missing)
  - ext/skills.md → /missing/concept.md (target missing)
```

### 2. 孤儿页扫描

扫所有 wiki 页，找无入链的 concept（没有任何其他页链接到它）。

输出：
```
⚠ Orphan pages (2):
  - services/lsp.md (no inbound links)
  - system/history.md (no inbound links)
```

**处理建议**：
- 该合并到其他页 → 提示合并
- 该被其他页引用 → 提示加链接
- 确实独立 → 加到 index.md 让它可被发现

### 3. stale concept 扫描

扫所有 concept 的 `resource` 字段，检查指向的代码路径是否存在。

输出：
```
⚠ Stale concepts (1):
  - ext/old-feature.md (resource: src/old-feature/ — directory deleted)
```

**处理建议**：
- 代码已删 → 提示删 wiki 页
- 代码重命名 → 提示更新 `resource` 字段

### 4. sync_commit drift

比较 index.md 的 `sync_commit` 和 git HEAD。

输出：
```
ℹ sync_commit drift:
  - wiki sync_commit: a0feac69
  - git HEAD: 42a5b4d9
  - 12 commits behind (建议更新)
```

### 5. 缺失页扫描（启发式）

扫代码目录，找"重要但没 wiki 页"的模块。

**启发式**：
- 目录下文件数 > 阈值（比如 5 个）
- 目录被多处 import（高 fan-in）
- 目录有 README.md 但没对应 wiki 页

输出：
```
⚠ Missing wiki pages (2):
  - src/utils/ (8 files, high fan-in, no wiki page)
  - src/bridge/ (has README.md, no wiki page)
```

### 6. type 合规

扫所有 frontmatter 的 `type` 字段，检查是否在词汇表内（P1 的 7 个）。

**OKF §4.1 规定**：未知 type 不该被拒绝。所以**警告非错误**。

输出：
```
⚠ Unknown types (1):
  - some/old-page.md (type: Legacy — not in vocabulary)
```

### 7. review 标记扫描（P4 闭环）

扫所有 freeform 段的 `<!-- review: ... -->` 标记。

对每个标记段：
- 检查上游 concept 最近 N 次 commit 是否动过
- 上游稳定（没动）→ 提示用户复查
- 上游还在动 → 保留，报告"等待上游稳定"

输出：
```
⚠ Review marks (2):
  - core/repl.md # Architecture (upstream stable since 2026-07-15, review now)
  - engine/context.md # Gotchas (upstream still changing, wait)
```

## 输出格式

汇总报告：
```
# code-wiki lint report

✓ 19 concepts, 0 errors
⚠ 5 warnings:
  - 3 broken links
  - 2 orphan pages
  - 1 stale concept
  - 12 commits behind
  - 2 missing wiki pages
  - 1 unknown type
  - 2 review marks

Run `/code-wiki fix` to auto-fix safe items? (y/n)
```

## fix 操作（可选）

用户确认后批量修：
- 删 stale concept（代码已删的）
- 更新 resource 字段（代码重命名的）
- 加孤儿页到 index.md

**不自动修**：
- 断链（可能是有意未写）
- 缺失页（需要人工判断该不该建）
- review 标记（需要人工复查）

## 关键决策

- **输出报告不自动修**（Karpathy 式）— lint 是只读检查
- **fix 可选**（用户确认后批量修安全项）
- **断链/未知 type 警告非错误**（OKF 允许）
- **review 标记闭环**（P4）— lint 是 review 标记的出口

## 辅助脚本

`scripts/lint-wiki.js`（建议）：
- 扫所有 wiki 文件
- 跑 7 项检查
- 输出报告

**理由**：lint 是机械检查，脚本化最稳。

## 验证

- [ ] 跑 `/code-wiki lint`，输出报告
- [ ] 断链扫描正确
- [ ] 孤儿页扫描正确
- [ ] stale concept 扫描正确
- [ ] sync_commit drift 正确
- [ ] 缺失页启发式不误报
- [ ] review 标记闭环正确（上游稳定/还在动）
- [ ] fix 操作能批量修安全项

## TODO

- [ ] 写 7 项检查指令（SKILL.md）
- [ ] 定义输出报告格式
- [ ] 写 fix 操作指令（可选批量修）
- [ ] 可选：写 `scripts/lint-wiki.js` 辅助脚本
- [ ] dogfood 验证
