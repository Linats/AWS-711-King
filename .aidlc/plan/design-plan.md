# 设计计划 - 优惠券发放与核销中心

## 输入基线

- 事实来源：根目录主规格、`.aidlc/requirements/functional-requirements.md`、`non-functional-requirements.md`、`user-stories.md`、`requirements-checklist.md`。
- 技术约束：单机前后端分离；根目录 `src/backend|frontend|shared`；PostgreSQL 16；Express + Prisma；React + Vite；Bedrock SDK/API Key 双路径；AI 失败时规则降级。
- 当前实现：`src/backend`、`src/frontend`、`src/shared` 均为空；本阶段只完成设计，不声明已有实现或测试。
- 范围排除：微服务、Kubernetes、Redis/CDN、批量操作、分享、离线核销、支付、公开注册和未被 FR/US 支持的用户管理。

## 设计阶段计划

### [x] 1. 确认设计决策
- 后端固定 Express，前端状态采用 Zustand + TanStack Query，数据库固定 PostgreSQL 16。
- AI 采用 `bedrock.service.txt` 的 SDK 凭据与 API Key Bearer 两条独立路径。

### [x] 2. 确认设计细节
- Seed 包含 6 个演示账号；API 使用 HTTP 状态码 + 业务错误码；前后端均做角色守卫。
- access token 短期有效，refresh token 哈希持久化、轮换和撤销。

### [x] 3. 创建系统架构文档
- 已统一为单机模块化单体后端 + React SPA + PostgreSQL 16。
- 已明确根目录结构、领域职责、事务、降级、安全、日志和单机部署边界。

### [x] 4. 创建数据库设计文档
- 已覆盖 users、refresh_tokens、campaigns、coupons、claim_records、verifications、risk_rules、risk_records、ai_call_logs、audit_logs。
- 已明确库存 CAS、核销幂等、审核放行消费、索引、迁移和脱敏规则。

### [x] 5. 创建 API 规范文档
- 已覆盖 FR-001~FR-010 所需接口、权限、请求/响应、错误、分页、筛选和幂等。
- 已补齐 refresh token、`/admin/audit-logs`，删除公开注册和范围外用户管理接口。

### [x] 6. 创建前端设计文档
- 已覆盖四角色信息架构、页面状态、响应式、暗色、领券动画、token 生命周期和缓存失效。
- 已删除注册、批量、分享、离线核销和未要求的管理员用户管理页面。

### [x] 7. 完成 AI 集成设计
- AI 设计已归入系统架构、数据库、API 和技术栈文档。
- 已明确 SDK/API Key 路径、10 秒/60 秒超时、结果解析、AI 调用日志、热门推荐与规则风控降级。

### [x] 8. 创建技术栈文档
- 已锁定 Node.js 20、TypeScript、Express、Prisma、PostgreSQL 16、React/Vite 及 Bedrock SDK 系列。
- 已删除 Redis、CDN、Kubernetes、PM2 cluster、Prometheus/Grafana 等非本期必需依赖。

### [x] 9. 创建追踪矩阵并完成一致性评审
- 已完整映射 FR-001~010、NFR-001~007、US-001~012 与 T-001~017。
- 已明确所有实现与测试均待执行，不保留虚构测试用例通过、覆盖率、TPS、上线或可用性结果。

## 一致性评审证据

| 检查项 | 证据 | 结论 |
|---|---|---|
| 架构与目录 | 六份设计均使用单机模块化单体和 `src/backend|frontend|shared` | 一致 |
| 技术栈 | 架构、数据、API、前端和技术栈均为 PostgreSQL 16 + Express/Prisma + React/Vite | 一致 |
| 状态术语 | 活动、券、领券结果、风控和审核状态以 database-design §3 为统一词汇 | 一致 |
| 认证 | 架构、数据库、API、前端均采用 access token + refresh token 轮换 | 一致 |
| AI | 双路径、超时、AI日志、推荐/风控降级在四份设计中契约一致 | 一致 |
| 风控审核 | review 不扣库存；operator 放行后用户重试并一次性消费放行 | 一致 |
| 核销幂等 | `(coupon_id,biz_order_no)` 唯一约束与首次响应快照 | 一致 |
| 审计 | 关键操作写 audit_logs，admin 通过 `/admin/audit-logs` 只读查询 | 一致 |
| 范围 | 无微服务/K8s/Redis/CDN/批量/分享/离线核销 | 一致 |
| 追踪 | 10 FR、7 NFR、12 US 均映射设计、任务和待执行验证 | 无孤立需求 |

## 决策记录

- ADR-001：采用单机模块化单体，不采用微服务或分布式基础设施。
- ADR-002：使用 PostgreSQL 16 + Prisma Migrate；库存并发由事务和 CAS 保证。
- ADR-003：Bedrock SDK 与 API Key 为显式独立路径，失败进入规则降级，不自动切换凭据模式。
- ADR-004：refresh token 仅以哈希存库并轮换，access token 由前端内存持有。
- ADR-005：风控规则由 `risk_rules` 配置，AI 调用由 `ai_call_logs` 追踪。
- ADR-006：核销幂等键为同券 + 同业务单号，保存首次响应快照。

## 门禁结论

- 第 3~9 项已完成，无空白问答。
- 六份设计文档互相一致并覆盖全部正式需求。
- 设计阶段门禁通过，可进入实现计划；实现和真实测试尚未开始。

---
**状态**：设计阶段已完成并通过一致性评审
