# 09 - OKF 合规校验

> Status: **DONE**
> 依赖: 02

## 目标

实现 OKF v0.1 合规校验逻辑，供 init 的 VALIDATE 阶段和 lint 调用。

## OKF v0.1 硬约束（§9 Conformance）

1. 每个 non-reserved `.md` 文件必须有可解析的 YAML frontmatter
2. 每个 frontmatter 必须有非空 `type` 字段
3. `index.md` / `log.md` 若存在需符合 §6/§7 结构

**保留文件名**：`index.md`、`log.md`（其他 `.md` 一律是 concept，必须有 frontmatter）

## 校验项

### 硬约束（错误）

1. **frontmatter 存在性**
   - 每个 non-reserved `.md` 必须有 `---`...`---` 块
   - 缺失 → ERROR

2. **type 字段非空**
   - frontmatter 必须有 `type:` 字段且值非空
   - 缺失/空 → ERROR

3. **index.md 结构**（§6）
   - 若存在，body 应是列表格式
   - 严重违反 → ERROR

4. **log.md 结构**（§7）
   - 若存在，日期 heading 应是 ISO 8601 `YYYY-MM-DD`
   - 严重违反 → ERROR

### 软约束（警告）

5. **推荐字段缺失**
   - `title` / `description` / `resource` / `tags` / `timestamp` 缺失 → WARN
   - OKF §4.1 不强制

6. **未知 type**
   - `type` 值不在 P1 的 7 个词汇表内 → WARN
   - OKF §4.1 允许未知 type

7. **断链**
   - markdown 链接目标不存在 → WARN
   - OKF §5.3 允许断链

8. **绝对路径链接**（可选）
   - 非 `/` 开头的 bundle-relative 链接 → INFO
   - OKF §5.1 推荐绝对路径但相对也合法

## 输出格式

```
# OKF Conformance Check

✓ 19 concepts, 0 errors
⚠ 3 warnings:
  - core/repl.md: missing 'description' field
  - ext/skills.md: unknown type 'Legacy'
  - services/api.md: broken link → /missing/concept.md
ℹ 5 info:
  - 5 concepts use relative links (OKF recommends absolute)

Conformant: YES (0 errors)
```

## 调用方

- **init 的 VALIDATE 阶段**（模块 02）— 生成后立即校验
- **lint 操作**（模块 04）— 用户主动跑健康检查

## 辅助脚本

`scripts/validate-okf.js`：
- 递归扫 `.wiki/**/*.md`
- 解析 frontmatter（**JSON-flow YAML 子集**，见下）
- 跑 8 项检查
- 输出报告

**Frontmatter 子集约束**（P2/Ponytail）：

为保持"零新增依赖"原则，frontmatter 只允许以下 YAML 子集（手写 ~50 行解析器即可）：
- 标量：`key: value`（字符串/数字/布尔）
- 列表：`key: [a, b, c]` 或多行 `- item`
- 简单 map：`key: {a: 1, b: 2}`
- **不允许**：多行字符串（`|`/`>`）、anchors（`&`/`*`）、tags（`!`）、复杂嵌套

code-wiki 生成的 frontmatter 只用 `type`/`title`/`description`/`resource`/`tags`/`timestamp`/`sync_commit`/`okf_version`/`generator`/`generated_at`，全部在子集内。

**理由**：YAML 解析 + 递归扫描是机械操作，脚本化最稳。CC 临场解析 YAML 容易出错。子集约束让手写解析器可行，避免引入 `js-yaml` 依赖。

## 关键决策

- **硬约束 ERROR，软约束 WARN**（OKF §9）
- **断链/未知 type 是 WARN 非 ERROR**（OKF 允许）
- **脚本化**（YAML 解析不稳）
- **JSON-flow YAML 子集**（Ponytail）— 手写解析器，零依赖，覆盖 code-wiki 生成的 frontmatter 全部字段

## 验证

- [x] 合规 wiki 校验通过（0 errors）
- [x] 缺 frontmatter 的文件报 ERROR
- [x] 缺 type 字段报 ERROR
- [x] index.md 结构错误报 ERROR
- [x] log.md 日期格式错误报 ERROR
- [x] 缺推荐字段报 WARN
- [x] 未知 type 报 WARN
- [x] 断链报 WARN

## TODO

- [x] 写校验逻辑（8 项检查）
- [x] 定义输出格式
- [x] 写 `scripts/validate-okf.js`（含手写 JSON-flow YAML 解析器 + 自检 fixture）
- [ ] 接入 init 的 VALIDATE 阶段（模块 02）
- [ ] 接入 lint 操作（模块 04）
- [ ] dogfood 验证
