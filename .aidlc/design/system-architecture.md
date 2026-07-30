# 系统架构设计 - 优惠券发放与核销中心

## 1. 输入基线与范围

- 事实来源：根目录主规格、`.aidlc/requirements/` 下 FR-001~FR-010、NFR-001~NFR-007、US-001~US-012。
- 部署约束：单机部署、前后端分离、REST API；不采用微服务、Kubernetes、消息队列、Redis、CDN 或分布式锁。
- 工程根目录固定为 `src/backend`、`src/frontend`、`src/shared`；前后端共享契约只放在 `src/shared`。
- 数据库固定为 PostgreSQL 16；后端固定为 Express + Prisma；前端固定为 React + Vite。
- 范围外：支付结算、公开注册、批量活动操作、分享奖励、离线核销、生产集群和多租户实现。扫码仅作为浏览器在线能力增强，手工输入券码必须可用。

## 2. 总体架构

```text
浏览器（React + Vite）
  ├─ customer：活动、推荐、领券、券包
  ├─ operator：活动管理、风控审核
  ├─ verifier：在线输入/扫码核销、核销记录
  └─ admin：统计、风控告警、审计日志
                 │ HTTPS/HTTP + JSON + JWT
                 ▼
单体后端（Node.js + TypeScript + Express）
  ├─ HTTP 层：路由、Zod 校验、认证、RBAC、错误映射、请求 ID
  ├─ 领域层：认证、活动、领券、核销、推荐、风控、统计、审计
  ├─ 集成层：Bedrock SDK 路径 / API Key Bearer 路径
  └─ 数据层：Prisma + PostgreSQL 16
```

这是“模块化单体”，各领域位于同一后端进程和同一数据库内。模块之间通过服务接口协作，不通过网络互调；事务边界由领券、核销、审核等应用服务控制。

## 3. 工程与模块边界

```text
src/
├─ backend/
│  ├─ prisma/                 # schema、迁移、seed
│  ├─ src/
│  │  ├─ app/                 # Express 装配、配置、健康检查
│  │  ├─ middleware/          # 认证、RBAC、校验、请求日志、错误处理
│  │  ├─ modules/
│  │  │  ├─ auth/             # 登录、刷新、登出、当前用户
│  │  │  ├─ campaigns/        # 活动查询与运营管理
│  │  │  ├─ claims/           # 原子库存扣减、券包
│  │  │  ├─ verifications/    # 幂等核销、记录查询
│  │  │  ├─ recommendations/  # AI推荐与热门降级
│  │  │  ├─ risk/             # AI评分、规则降级、人工审核
│  │  │  ├─ stats/            # 统计聚合
│  │  │  └─ audit/            # 审计写入与管理员查询
│  │  └─ integrations/bedrock/# 双路径适配器、解析、超时
│  └─ tests/
├─ frontend/
│  └─ src/                    # 路由、页面、组件、查询与状态
└─ shared/                    # DTO、枚举、错误码和分页契约
```

依赖方向为 HTTP 层 → 领域服务 → Prisma/Bedrock 适配器；领域服务不得依赖前端。AI 集成只由推荐和风控调用，失败不得阻断非 AI 核心能力。

## 4. 关键业务流程

### 4.1 认证与刷新

1. 登录校验 bcrypt 密码，签发短期 access token 和随机 refresh token。
2. access token 由前端以内存状态持有并通过 Bearer 头发送；refresh token 放入 HttpOnly Cookie，数据库仅保存哈希。
3. 刷新时校验未过期、未撤销的哈希，执行轮换：旧 token 撤销并签发新 token。
4. 登出撤销当前 refresh token；角色由服务端用户记录签入 access token，路由仍执行 RBAC。

### 4.2 领券、风控与并发

1. customer 发起领券，请求先进入风控评估。
2. 正常 AI 评分按 `<30=pass`、`30~70=review`、`>70=block` 判定；AI 不可用或结果非法时改用启用的 `risk_rules`。
3. `review` 或 `block` 写入风控记录，不扣库存、不创建券；`review` 等待 operator 审核。
4. operator 放行后生成一次性、有限期的审核放行状态；用户再次领券时消费该放行状态并进入正常事务，库存和限领规则仍必须满足。
5. `pass` 在 PostgreSQL 事务内通过条件更新 `remaining_stock > 0` 执行 CAS 扣减，再创建券和成功领券记录；任何一步失败则整体回滚。
6. 库存归零后活动可同步更新为 `sold_out`。重复或超过限领数返回确定业务错误，不产生库存变化。

### 4.3 幂等核销

1. verifier 提交 `couponCode + bizOrderNo`。
2. 先按 `(coupon_id, biz_order_no)` 查幂等记录；命中时返回首次响应快照。
3. 未命中时在事务内锁定/条件更新券状态，仅 `claimed` 且未过期的券可变为 `verified`，并写入核销记录。
4. 并发唯一冲突后回查首次记录。相同券、不同业务单号不会互相覆盖；若券已由其他业务单号核销，返回“已核销”。

### 4.4 AI 推荐与降级

1. 推荐服务读取用户历史和当前可用活动，构造最小必要上下文。
2. 配置为 SDK 模式时使用 AWS 凭据链；配置为 API Key 模式时使用 Bedrock Runtime REST + Bearer Token。API Key 不进入前端、日志或数据库。
3. 对话超时 60 秒；模型列表仅 SDK 路径可用且超时 10 秒。任一路径的超时、认证失败、限流、服务错误、空输出或 JSON 解析失败都触发规则降级。
4. 推荐降级按有效活动的近期领取量降序并稳定排序返回 Top 3；风控降级按 `risk_rules` 计算。
5. 每次 AI 尝试均写 `ai_call_logs`，记录用途、认证路径、模型、脱敏输入/输出、耗时、token、结果和降级原因。

## 5. 安全边界

- 所有业务接口默认认证；仅登录、刷新和健康检查按契约匿名可调用。
- 路由执行 RBAC：operator 管活动和审核，customer 领券/券包/推荐，verifier 核销，admin 统计/风控只读/审计日志。
- Zod 校验请求；Prisma 参数化访问；Helmet/CSP、受控 CORS 和 React 默认转义降低 XSS 风险。
- refresh token、密码、Bedrock API Key、AWS 凭据不得进入普通日志；审计详情和 AI 输入输出必须脱敏。
- 关键操作写不可由普通业务接口修改的 `audit_logs`：登录结果、token 撤销、活动变更、领券结果、核销、风控审核和权限拒绝。

## 6. 可观测性与故障处理

- 每个请求生成/透传请求 ID，结构化日志记录用户、角色、路由、状态和耗时。
- `/health` 检查进程和数据库；Bedrock 状态只作为降级信息，不使核心健康检查失败。
- 错误告警基于结构化错误日志和阈值规则落地，当前单机范围不绑定 Slack、邮件、Prometheus 或外部平台。
- AI 故障进入规则降级；数据库故障返回统一 503 且事务回滚；前端展示可重试错误态。
- 不以 Redis、CDN 或额外基础设施作为性能达标前提，通过索引、分页、连接池和查询聚合满足指标。

## 7. 单机部署拓扑

- 开发：Vite `5173`、Express `3000`、PostgreSQL `5432`，均在本机运行。
- 正式单机：前端静态产物和后端 Node.js 进程独立运行，PostgreSQL 16 同机或同一受控主机；可选同机反向代理，但不是系统依赖。
- 仅维护一个后端实例，不启用 PM2 cluster、负载均衡或容器编排；并发一致性由 PostgreSQL 事务和约束保证。

## 8. 架构决策

| 编号 | 决策 | 理由与影响 |
|---|---|---|
| ADR-001 | 单机模块化单体 + 前后端分离 | 满足 CON-001/005，降低部署复杂度，排除微服务和集群方案。 |
| ADR-002 | Express + Prisma + PostgreSQL 16 | 与需求确认一致，兼顾类型安全、迁移、JSONB 和行级并发控制。 |
| ADR-003 | Bedrock SDK/API Key 显式双路径 | SDK 使用凭据链，API Key 使用 Bearer REST；统一响应和降级契约。 |
| ADR-004 | 数据库 CAS + 唯一约束保证一致性 | 无需分布式锁或 Redis，适合单机并满足库存与核销幂等。 |
| ADR-005 | refresh token 哈希持久化并轮换 | 支持安全刷新、撤销和登出，避免长期 access token。 |
| ADR-006 | 规则表驱动风控 | 满足 NFR-001/NFR-004，AI 故障仍可工作且规则可审计。 |

## 9. 设计状态

本文档完成架构设计；实现与真实测试尚未开始，不声明任何运行、性能或验收结果。
