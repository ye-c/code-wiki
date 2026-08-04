# code-wiki

> Generate and maintain OKF-compliant code navigation wiki for any project.

Claude Code plugin。为任意代码项目生成并维护 OKF v0.1 合规的代码导航 wiki。

## 设计理念

- **init 构建框架**：自动生成通用项目级导航结构与高质量初始文档，这是基础。
- **Agent 驱动维护**：用户不手动改 wiki。遇到关键问题让 LLM 通过 `ingest` 归档，`update` 随代码变更增量同步。一切维护通过 Agent 执行。
- **首先服务于 LLM**：wiki 的结构设计让 LLM 能准确定位信息，其次才是服务于人。
- **活的 wiki**：维护便利性决定可持续性，复杂流程会让 wiki 失修而死。持续更新的 wiki 才是高效的 wiki。

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
