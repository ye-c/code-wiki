# code-wiki

> Generate and maintain OKF-compliant code navigation wiki for any project.

## 项目定位

`code-wiki` 是一个 Claude Code plugin，为任意代码项目生成并维护 OKF v0.1 合规的代码导航 wiki。

结合三个来源：
- **OKF v0.1** (Google, 2026-06) — 格式规范
- **Karpathy LLM Wiki** — 维护模式
- **OpenWiki** (LangChain, 2026-07) — 产品形态

## 安装

### 本地加载

```bash
# 方式 A: symlink
ln -s /path/to/code-wiki ~/.claude/plugins/local/code-wiki

# 方式 B: 在目标项目 .claude/plugins.json 配置本地路径
```

验证 `/plugin` 能看到 code-wiki。

## 使用

```
/code-wiki init     # 生成初始 wiki
/code-wiki update   # git diff 驱动增量更新
/code-wiki lint     # 健康检查
/code-wiki ingest   # 归档对话产物
```

## 文档

完整开发文档见 [docs/](docs/)：
- [architecture.md](docs/architecture.md) — 整体架构
- [decisions.md](docs/decisions.md) — P1-P9 决策记录
- [modules/](docs/modules/) — 10 个模块的实现文档

## 状态

v0.1 开发中。MVP 范围：init + CLAUDE.md 注入 + OKF 校验。
