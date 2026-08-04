# code-wiki

> Generate and maintain OKF-compliant code navigation wiki for any project.

Claude Code plugin。为任意代码项目生成并维护 OKF v0.1 合规的代码导航 wiki。

## 安装

```bash
claude plugin marketplace add ye-c/code-wiki
claude plugin install code-wiki@code-wiki
```

本地开发：`claude plugin marketplace add /absolute/path/to/code-wiki`，再同上 install。

## 使用

```
/code-wiki:init     # 生成初始 wiki
/code-wiki:update   # git diff 驱动增量更新
/code-wiki:lint     # 健康检查
/code-wiki:ingest   # 归档对话产物
```

## 文档

- [architecture.md](docs/architecture.md) — 整体架构
- [decisions.md](docs/decisions.md) — P1-P10 决策记录
