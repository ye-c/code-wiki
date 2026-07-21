# 10 - Dogfood 计划

> Status: **TODO**
> 依赖: 全部

## 目标

在 claude-bro 项目里安装 code-wiki plugin，迁移现有 `wiki/` 到 `.wiki/`，验证完整工作流。

claude-bro 是 code-wiki 的第一个用户。

## 前置条件

- 模块 01（plugin 骨架）完成
- 模块 02（init）完成
- 模块 08（CLAUDE.md 注入）完成
- 模块 09（OKF 合规校验）完成

（模块 03-07 可在 dogfood 后迭代）

## 步骤

### 1. 安装 plugin 到 claude-bro

把 code-wiki 作为本地 plugin 加载：
- 方式 A：symlink `~/.claude/plugins/local/code-wiki` → `/Users/chace.ye/code/code-wiki`
- 方式 B：在 claude-bro 的 `.claude/plugins.json` 配置本地路径

验证 `/plugin` 能看到 code-wiki。

### 2. 迁移现有 wiki/ 到 .wiki/

```bash
cd /Users/chace.ye/code/claude-bro
mv wiki .wiki
```

### 3. 加 .gitignore

在 `.wiki/.gitignore` 写 `*`。

### 4. 给所有 concept 文件加 frontmatter

参考 claude-bro 现有 wiki 的 19 个文件，批量加 frontmatter：
- type: Domain / Concept / Convention / ADR
- title / description / resource / tags / timestamp

### 5. 重写 index.md

加 frontmatter（okf_version + sync_commit），body 改 OKF §6 格式。

### 6. 处理 system/history.md

它是 ADR 类型，加 frontmatter `type: ADR`。

### 7. 删除 domains/

claude-bro 的 `wiki/domains/` 目录冗余，删掉。

### 8. 跑 init 验证

在干净状态（删掉 .wiki/）跑 `/code-wiki init`，对比生成结果和原 wiki：
- 域划分是否合理
- concept 是否覆盖关键文件
- frontmatter 是否合规
- CLAUDE.md 是否被注入

### 9. 跑 lint 验证

`/code-wiki lint` 应输出报告，无 ERROR。

### 10. 测试 Boy Scout Rule

在 claude-bro 改一个文件，看 CC 是否顺手更新 wiki（靠 CLAUDE.md 协议段第 5 条）。

## 验证

- [ ] plugin 能加载
- [ ] `/code-wiki` 命令能触发
- [ ] 现有 wiki 迁移到 .wiki/ 后 OKF 合规
- [ ] CLAUDE.md 含 Code Wiki Retrieval Protocol 段
- [ ] CC 会话开始时能读到 .wiki/index.md
- [ ] 干净 init 生成的 wiki 和原 wiki 质量相当
- [ ] lint 报告 0 errors

## TODO

- [ ] 等 01/02/08/09 完成
- [ ] 安装 plugin 到 claude-bro
- [ ] 迁移 wiki/ → .wiki/
- [ ] 加 .gitignore
- [ ] 批量加 frontmatter
- [ ] 重写 index.md
- [ ] 处理 history.md
- [ ] 删 domains/
- [ ] 跑 init 验证
- [ ] 跑 lint 验证
- [ ] 测试 Boy Scout Rule
