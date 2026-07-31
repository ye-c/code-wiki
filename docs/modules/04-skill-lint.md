# 04 - Skill: lint 操作

> Status: **DONE**
> 依赖: 02

## 目标

实现 `/code-wiki lint` — wiki 健康检查，输出报告（不自动修）。

对齐 Karpathy lint 操作：
> Look for: contradictions between pages, stale claims, orphan pages, missing cross-references, data gaps.

## 实现

lint 融进 `scripts/validate-okf.js`，不单独写 `scripts/lint-wiki.js`。SKILL.md 的 lint 块直接调 `node <plugin-dir>/scripts/validate-okf.js .wiki`。

## 检查项

lint 复用 `validate-okf.js` 的 10 项检查（详见模块 09），重点关注其中 3 项 warning：

### 1. 断链扫描

扫所有 wiki 页的 markdown 链接，检查目标是否存在。

**OKF §5.3 规定**：断链不是 malformed，可能代表"还没写的知识"。所以**警告非错误**。

### 2. 孤儿页扫描

扫所有 wiki 页，找无入链的 concept（没有任何其他页链接到它，含 index.md）。

**处理建议**：
- 该合并到其他页 → 提示合并
- 该被其他页引用 → 提示加链接
- 确实独立 → 加到 index.md 让它可被发现

### 3. stale concept 扫描

扫所有 concept 的 `resource` 字段，检查指向的代码路径是否存在（`.wiki/` 父目录作为项目根）。

**处理建议**：
- 代码已删 → 提示删 wiki 页（update 会记 log，不自动删）
- 代码重命名 → 提示更新 `resource` 字段

## WONTFIX（原 04 规划，已砍）

### sync_commit drift 检查（原第 4 项）

**WONTFIX**：drift 检测融进 update Phase 1（git diff 自然发现）。lint 不重复检查。用户想看 drift 跑 `/code-wiki update`。

### 缺失页启发式（原第 5 项）

**WONTFIX**：纯靠 LLM 猜，极易误报，噪音大。用户自己判断该不该建新页。

### review 标记闭环（原第 7 项）

**保留检查，但触发源改**：原设计依赖 07 hook 标 drift → update 加 review 标记 → lint 扫。砍 07 后，触发源改为 Boy Scout Rule（CLAUDE.md 协议段第 5 条，LLM 改代码时顺手加）。lint 仍可扫 `<!-- review: ... -->` 标记，但不再依赖 hook。

### fix 操作

**WONTFIX**：stale concept 修复融进 update（记 log，不自动删）。lint 只读，不修。

## 关键决策

- **lint 融进 validate-okf.js**（P10）— 0 新脚本，复用现有机械检查器
- **输出报告不自动修**（Karpathy 式）— lint 是只读检查
- **断链/孤儿/stale 警告非错误**（OKF 允许）
- **drift 检测交 update**（P10）— 不重复

## 验证

- [x] 跑 `/code-wiki lint`，输出报告
- [x] 断链扫描正确
- [x] 孤儿页扫描正确
- [x] stale concept 扫描正确
- [x] validate-okf.js self-check PASS

## TODO

- [x] 写 lint 块指令（SKILL.md）
- [x] validate-okf.js 扩充孤儿页 + stale concept
- [x] dogfood 验证
