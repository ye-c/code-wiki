# 03 - Skill: update 操作

> Status: **DONE**
> 依赖: 02

## 目标

实现 `/code-wiki update` — git diff 驱动增量更新，重生成结构化段（含段词表 4 段），不动 freeform。

## 流程（3 阶段）

```
DETECT → REGENERATE → VALIDATE
```

### 全局要求：Task 规划

update 是多阶段长链任务。开始前必须用 `TaskCreate` 创建 3 个任务（对应 3 阶段），每阶段开始时 `TaskUpdate` 标 in_progress，完成标 completed。

### Phase 1: DETECT

1. 读 `.wiki/index.md`，解析 frontmatter，提取 `sync_commit`。
2. 跑 `git rev-parse --short HEAD` → 当前 HEAD。
3. 构建变更文件列表：
   - **HEAD == sync_commit**：跑 `git status --porcelain`。输出为空 → 打印 `wiki 已是最新，无需更新` 并**停止**。否则提取文件路径（去掉 `?? ` `M  ` 等状态前缀）。
   - **HEAD != sync_commit**：跑 `git diff <sync_commit>..HEAD --name-only` 拿已提交变更，再跑 `git status --porcelain` 拿未提交变更，合并去重。打印 `wiki N commits behind`（N = `git rev-list --count <sync_commit>..HEAD`），让用户知道 drift 程度，然后继续。
4. 过滤非源码路径：`.wiki/` `.git/` `node_modules/` `__pycache__/` `.venv/` `.tox/` `dist/` `build/` 下的全部丢弃。

**drift 自然报**：update Phase 1 跑 git diff 时自然发现 drift 并报告。零 hook，零 LLM 主动性依赖。用户主动触发 update = 确定性。

### Phase 2: REGENERATE

1. 扫所有 `.wiki/**/*.md`（跳过 `index.md`、`log.md`），解析 frontmatter `resource` 字段。
2. 构建 reverse map：`resource path → concept file path`。
3. 对每个变更文件找 owner concept：
   - **精确匹配**：`resource` 值等于文件路径。
   - **目录前缀匹配**：`resource` 是文件路径的目录前缀（如 resource `tts/` 匹配 `tts/kokoro.py`）。
   - **无匹配**：记录为 unmapped。
4. 对每个受影响的 concept 文件：
   - 重读 `resource` 指向的源文件。
   - 更新 frontmatter `timestamp` 为今天（ISO 8601）。
   - **重生成段词表 4 段**（按 P2 段选择决策表）：
     - `## Purpose` — 业务目的（如果代码语义变了，更新）
     - `## Usage` — 怎么用（如果 API 变了，更新）
     - `## Relationships` — 连接关系（如果依赖变了，更新）
     - `## Notes` — 边界条件（如果代码边界变了，更新）
   - **不动 freeform 段**（Gotchas / ADR / 用户手填内容，包括 `<!-- TODO: ingest -->` 占位后的内容）。
5. unmapped 文件不建新 concept，记到 log。
6. **stale concept 检测**：扫所有 concept 的 `resource` 字段，如果路径在硬盘上不存在（代码已删/重命名），记到 log 为 stale。**不自动删 concept**（删不可逆，让用户手动）。输出提示用户复查。

### Phase 3: VALIDATE

1. 跑 `node <plugin-dir>/scripts/validate-okf.js .wiki`。errors > 0 → 修后重跑。
2. 更新 `.wiki/index.md` frontmatter：`sync_commit` 设为当前 HEAD 短 hash，`generated_at` 设为现在。
3. 追加 `.wiki/log.md`（若无 `## <today>` heading 则建）：
   ```
   * **update**: Synced N concepts (<names>). Unmapped: M files (<filenames>). Stale: K concepts (<names>). sync_commit=`<hash>`.
   ```
   变更文件名必须写进 log，便于追溯。stale concept 名也写进 log，提示用户复查。文件末尾留一个换行。
4. 输出：
   ```
   update 完成
   - 检测 N 个变更文件
   - 更新 M 个 concept: <list>
   - K 个未映射文件: <list>
   - J 个 stale concept: <list>（resource 路径不存在，请手动复查）
   - sync_commit → <hash>
   ```

## 关键决策

- **只重生成结构化段**（P4）— freeform 是人/LLM 后续补的，update 不覆盖。
- **reverse map 驱动** — 不依赖 hooks，git diff 是唯一变更来源。
- **drift 自然报**（P10）— update Phase 1 跑 git diff 时自然发现 drift 并报告，零 hook，零 LLM 主动性依赖。
- **stale concept 不自动删**（P10）— 删不可逆，记 log 提示用户手动复查。
- **unmapped 不建新 concept** — 避免自动膨胀，新 concept 由用户显式 ingest 或下次 init。
- **不拓扑排序** — Relationships 段的跨 concept 链接由 LLM 重读源码生成，不是扫其他 wiki 页。A 依赖 B 且 B 变，只有 A 的源码 imports 变了 A 才需重生成 — 而 imports 变了意味着 A 的源码变了，A 已在变更集里。无需"先 B 后 A"顺序。

## v0.2 考虑（不实现）

- freeform 段 review 标记（upstream 变更时静默 stale 提示）。
- `scripts/update-wiki.js`（如果 CC 推理不稳）。

## 验证

- [x] 新文件（drift_probe.py）→ log 记录 unmapped
- [x] sync_commit 前进到 HEAD
- [x] validate-okf.js 0 errors
- [x] log.md 有 update 记录
- [x] drift 自然报（Phase 1 报 N commits behind）
- [ ] 已有文件修改 → owner concept timestamp 更新（未在 fixture 验证）
- [ ] stale concept 记 log（未在 fixture 验证）

## TODO

- [x] 写三阶段指令（SKILL.md）
- [x] drift 自然报（Phase 1）
- [x] stale concept 检测（Phase 2 step 6）
- [x] dogfood 验证（fasttts fixture）
