# 08 - CLAUDE.md 自动注入

> Status: **TODO**
> 依赖: 02

## 目标

init 完成后自动在项目 CLAUDE.md 追加 Code Wiki Retrieval Protocol 段，让 CC 每次会话先查 wiki。

对齐 Karpathy 第三层（schema 层）+ OpenWiki 的关键动作。

## 协议段内容

```markdown
## 🤖 Code Wiki Retrieval Protocol

@.wiki/index.md

Before reading or editing any files, you MUST:
1. Read the `.wiki/index.md` imported above to identify which domain/module your task belongs to.
2. Use the `Read` tool to load that domain's map under `.wiki/`.
3. Follow the dependencies and guidelines in that map before touching the source code.
4. **Dynamic Addressing**: Do not trust or ask for absolute line numbers. Use `Grep` to find the exact current location of classes/functions mentioned in the Wiki.
5. **Boy Scout Rule**: If you find the Wiki is missing details or outdated while completing your task, you MUST incrementally update the corresponding map and its `sync_commit` hash.
```

## 5 条规则来源

| # | 规则 | 来源 |
|---|------|------|
| 1 | Read index first | Karpathy "LLM reads index first" |
| 2 | Load domain map | OKF §6 渐进式披露 |
| 3 | Follow dependencies | OKF §5 cross-linking |
| 4 | Dynamic Addressing | claude-bro 现有规则（line number 不可信） |
| 5 | Boy Scout Rule | claude-bro 现有规则（drift 时顺手更新） |

**第 5 条是关键**：让 CC 在正常工作时顺手维护 wiki，不依赖用户主动跑 update。这是 Karpathy "LLM does all the grunt work" 的实现，限定在"顺手"范围。

## 注入逻辑

### 检测现有 CLAUDE.md

```
无 CLAUDE.md → 创建，写入协议段
有 CLAUDE.md 且无 wiki 协议段 → 追加到末尾
有 CLAUDE.md 且有 wiki 协议段（重新 init 场景）→ 更新路径引用，不重复追加
```

### 分隔符

协议段用 `## 🤖 Code Wiki Retrieval Protocol` 作为 heading，方便检测和更新。

### 路径引用

协议段第一行 `@.wiki/index.md` — CC 的 import 语法，让 index.md 自动加载到上下文。

## init 输出告知

```
已自动更新 CLAUDE.md，添加 Code Wiki Retrieval Protocol
- CC 每次会话会先读 .wiki/index.md 再动代码
- 想跳过：删除 CLAUDE.md 里的 "## 🤖 Code Wiki Retrieval Protocol" 段
- 团队项目：commit CLAUDE.md 让全团队共享此协议
```

## 关键决策

- **默认自动追加**（P7）— 降低摩擦，wiki 立即生效
- **检测已有则更新不重复**（P7）— 避免重复 init 场景下重复追加
- **无 flag**（P7）— 用户想跳过自己删段，YAGNI
- **CLAUDE.md git 行为不干预** — 由用户现有策略决定

## 验证

- [ ] 无 CLAUDE.md 项目，init 后创建 CLAUDE.md 含协议段
- [ ] 有 CLAUDE.md 无协议段项目，init 后追加到末尾
- [ ] 有 CLAUDE.md 有协议段项目，重新 init 后更新不重复
- [ ] 协议段第一行 `@.wiki/index.md` 正确
- [ ] 5 条规则完整
- [ ] init 输出告知文案正确

## TODO

- [ ] 写协议段内容（固定 5 条规则）
- [ ] 写 CLAUDE.md 检测逻辑（无/有/已有协议段三分支）
- [ ] 写注入逻辑（创建/追加/更新）
- [ ] 写 init 输出告知文案
- [ ] 在 init 流程末尾接入（模块 02 阶段 6）
- [ ] dogfood 验证
