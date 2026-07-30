# API 规范 - 优惠券发放与核销中心

## 1. 通用约定

- Base URL：`http://localhost:3000/api/v1`
- 数据格式：UTF-8 JSON；时间为 ISO 8601 UTC。
- access token：`Authorization: Bearer <token>`；refresh token：HttpOnly Cookie。
- 列表默认 `page=1&pageSize=20`，`pageSize` 最大 100。
- 服务端生成或透传 `X-Request-ID`，响应头返回同一值。

成功响应：

```json
{"code":0,"message":"success","data":{}}
```

错误响应：

```json
{"error":{"code":"VALIDATION_ERROR","message":"请求参数不合法","requestId":"req_xxx","details":[]}}
```

分页响应：

```json
{"code":0,"data":[],"pagination":{"page":1,"pageSize":20,"total":0,"totalPages":0}}
```

## 2. 认证与安全规则

- 除登录、刷新、健康检查外，接口均要求 access token。
- 角色权限由后端 RBAC 判断，前端隐藏菜单不能替代鉴权。
- 登录签发短期 access token；refresh token 随机生成、数据库存哈希、Cookie 使用 `HttpOnly`、`SameSite=Lax`，正式 HTTPS 环境启用 `Secure`。
- 每次刷新执行 token 轮换并撤销旧 token；登出撤销当前 refresh token 并清 Cookie。
- 本期不提供 `/auth/register`、管理员用户 CRUD、批量操作、分享或离线核销 API。

## 3. 端点清单

### 3.1 认证

| 方法 | 路径 | 权限 | 说明 | 映射 |
|---|---|---|---|---|
| POST | `/auth/login` | 公开 | 登录并设置 refresh Cookie | FR-001 |
| POST | `/auth/refresh` | 持有效 refresh Cookie | 轮换 token，返回新 access token | FR-001、NFR-005 |
| POST | `/auth/logout` | 登录用户或有效 refresh Cookie | 撤销 refresh token | FR-001、NFR-005 |
| GET | `/auth/me` | 所有已登录角色 | 当前用户 | FR-001 |

### 3.2 活动

| 方法 | 路径 | 权限 | 说明 | 映射 |
|---|---|---|---|---|
| GET | `/campaigns` | 所有已登录角色 | 分页查询；customer 默认只见可领取活动 | FR-002、US-003 |
| GET | `/campaigns/:id` | 所有已登录角色 | 活动详情 | FR-002 |
| POST | `/campaigns` | operator | 创建草稿活动 | FR-002 |
| PUT | `/campaigns/:id` | operator | 编辑活动 | FR-002 |
| PATCH | `/campaigns/:id/status` | operator | 发布、暂停、恢复等合法状态流转 | FR-002 |
| DELETE | `/campaigns/:id` | operator | 软删除 | FR-002 |

### 3.3 领券、券包和推荐

| 方法 | 路径 | 权限 | 说明 | 映射 |
|---|---|---|---|---|
| POST | `/campaigns/:id/claim` | customer | 风控后原子领券 | FR-003、FR-007 |
| GET | `/my-coupons` | customer | 按状态筛选并按领取时间倒序分页 | FR-008 |
| GET | `/recommendations` | customer | AI 推荐或热门规则降级 | FR-006 |

### 3.4 核销

| 方法 | 路径 | 权限 | 说明 | 映射 |
|---|---|---|---|---|
| POST | `/verify` | verifier | 在线核销，`couponCode + bizOrderNo` 幂等 | FR-004 |
| GET | `/verifications` | verifier、admin | 按活动、时间、用户分页筛选 | FR-009 |

### 3.5 风控审核

| 方法 | 路径 | 权限 | 说明 | 映射 |
|---|---|---|---|---|
| GET | `/risk/records` | operator、admin | 风控记录分页；admin 只读 | FR-007、FR-010 |
| POST | `/risk/records/:id/review` | operator | 对 pending 记录放行或拒绝 | FR-010 |

### 3.6 统计、审计和健康

| 方法 | 路径 | 权限 | 说明 | 映射 |
|---|---|---|---|---|
| GET | `/stats/overview` | admin | 领取率、核销率、剩余库存和趋势 | FR-005 |
| GET | `/stats/campaigns/:id` | operator、admin | 单活动统计 | FR-005 |
| GET | `/admin/audit-logs` | admin | 审计日志分页查询 | NFR-005、NFR-007 |
| GET | `/health` | 公开 | 进程和数据库健康 | NFR-007 |

## 4. 核心契约

### 4.1 `POST /auth/login`

请求：

```json
{"username":"customer_a","password":"cust123"}
```

成功 `200`：

```json
{"code":0,"message":"登录成功","data":{"accessToken":"<jwt>","expiresIn":900,"user":{"id":"uuid","username":"customer_a","displayName":"用户A","role":"customer"}}}
```

refresh token 仅通过 Set-Cookie 返回。错误：`AUTH_INVALID_CREDENTIALS`(401)、`VALIDATION_ERROR`(400)。登录成功和失败均写审计日志，失败日志不得保存密码。

### 4.2 `POST /auth/refresh`

无请求体，从 Cookie 取 refresh token。成功返回新的 access token，并轮换 refresh Cookie。错误：`AUTH_REFRESH_INVALID`(401)、`AUTH_REFRESH_REUSED`(401)。重放已轮换 token 时撤销可识别的后继链并要求重新登录。

### 4.3 `POST /campaigns`

请求字段：`name`、`description?`、`couponType`、`value`、`totalStock`、`perUserLimit`、`startTime`、`endTime`、`rules?`、`metadata?`。约束：库存 `1..100000`，限领 `>=1`，结束时间晚于开始时间。成功 `201`，初始状态 `draft`。

状态流转：`draft→active/deleted`；`active→paused/sold_out/expired/deleted`；`paused→active/expired/deleted`。到期或库存归零可由请求时校正为 `expired/sold_out`。

### 4.4 `POST /campaigns/:id/claim`

请求体为空。成功 `200`：

```json
{"code":0,"message":"领取成功","data":{"couponId":"uuid","couponCode":"CP...","campaignId":"uuid","campaignName":"测试券","value":10,"expiresAt":"2026-12-31T23:59:59Z","risk":{"score":12,"decision":"pass","source":"ai"}}}
```

人工审核 `202`：

```json
{"code":0,"message":"请求已进入人工审核","data":{"riskRecordId":"uuid","decision":"review","reviewStatus":"pending"}}
```

错误：`CAMPAIGN_INACTIVE`(409)、`COUPON_OUT_OF_STOCK`(409)、`COUPON_ALREADY_CLAIMED`(409，限领为1)、`COUPON_EXCEED_LIMIT`(409)、`RISK_BLOCKED`(429)。AI 失败但规则放行时仍可成功，响应中的 `source` 为 `rule`；降级详情只进日志，不暴露秘密。

### 4.5 `GET /my-coupons`

查询：`status=all|usable|used|expired`、`page`、`pageSize`。`usable` 映射未过期 `claimed`，`used` 映射 `verified`；服务端按时间校正过期展示。默认 `claimedAt desc`。

### 4.6 `GET /recommendations`

成功始终返回非空列表（存在可用活动时）：

```json
{"code":0,"data":[{"campaignId":"uuid","campaignName":"测试券","value":10,"reason":"符合近期偏好","source":"ai"}]}
```

AI 超时、鉴权失败、限流、错误、空输出或解析失败时返回 `source=rule` 的热门活动和确定性理由。没有可用活动时返回空列表和空状态，不伪造推荐。

### 4.7 `POST /verify`

请求：

```json
{"couponCode":"CP20260001","bizOrderNo":"ORDER-001"}
```

首次成功 `200`：

```json
{"code":0,"message":"核销成功","data":{"verificationId":"uuid","couponId":"uuid","couponCode":"CP20260001","bizOrderNo":"ORDER-001","result":"success","verifiedAt":"2026-07-29T10:00:00Z","idempotentReplay":false}}
```

相同券 + 相同业务单号再次请求，返回首次 `response_snapshot`，仅将 `idempotentReplay` 标记为 true；业务结果和首次时间不变。不同业务单号互不冲突，但券已成功核销时返回 `COUPON_ALREADY_VERIFIED`(409)。其他错误：`COUPON_NOT_FOUND`(404)、`COUPON_EXPIRED`(409)、`COUPON_NOT_CLAIMED`(409)。

### 4.8 `GET /verifications`

查询：`campaignId?`、`userId?`、`createdFrom?`、`createdTo?`、`page`、`pageSize`。verifier 和 admin 可查询；返回券码、活动、持有人、核销人、业务单号、结果和时间。

### 4.9 `POST /risk/records/:id/review`

请求：

```json
{"action":"approve","comment":"行为经核实正常"}
```

`action=approve|reject`。仅 pending 可处理；成功返回审核人、时间、状态。approve 生成一次性限时放行，customer 再次调用领券接口时消费；库存、活动状态和限领仍需重新校验。重复审核返回 `RISK_ALREADY_REVIEWED`(409)。

### 4.10 `GET /stats/overview`

查询：`startDate?`、`endDate?`。返回总活动数、领取数、核销数、领取率、核销率、剩余库存、日趋势、活动状态分布和近期风控告警。口径：领取数只计 `claim_records.result=issued`；核销数只计成功核销；领取率=`领取数/活动总库存`，核销率=`核销数/领取数`，分母为0时返回0。

### 4.11 `GET /admin/audit-logs`

查询：`actorId?`、`action?`、`resourceType?`、`outcome?`、`createdFrom?`、`createdTo?`、`page`、`pageSize`。仅 admin 可访问，默认按 `createdAt desc`，响应隐藏 token、密码、凭据和已脱敏字段原值。

## 5. 错误码

| 错误码 | HTTP | 含义 |
|---|---:|---|
| `VALIDATION_ERROR` | 400 | 参数不合法 |
| `AUTH_INVALID_CREDENTIALS` | 401 | 凭据错误 |
| `AUTH_TOKEN_EXPIRED` | 401 | access token 过期 |
| `AUTH_REFRESH_INVALID/REUSED` | 401 | refresh token 无效/重放 |
| `AUTH_INSUFFICIENT_PERMISSIONS` | 403 | 角色无权 |
| `CAMPAIGN_NOT_FOUND` | 404 | 活动不存在 |
| `CAMPAIGN_INACTIVE` | 409 | 活动不可领取 |
| `COUPON_OUT_OF_STOCK` | 409 | 库存不足 |
| `COUPON_ALREADY_CLAIMED` | 409 | 已领取（限领1） |
| `COUPON_EXCEED_LIMIT` | 409 | 超过限领 |
| `COUPON_NOT_FOUND` | 404 | 券不存在 |
| `COUPON_EXPIRED` | 409 | 券过期 |
| `COUPON_ALREADY_VERIFIED` | 409 | 已由其他请求核销 |
| `RISK_BLOCKED` | 429 | 风控拦截 |
| `RISK_ALREADY_REVIEWED` | 409 | 已审核 |
| `SERVICE_UNAVAILABLE` | 503 | 数据库等核心依赖不可用 |

## 6. 日志、幂等与性能要求

- 所有写接口记录结构化请求日志；关键写操作另写 `audit_logs`。
- 所有 AI 尝试写 `ai_call_logs`；输入输出脱敏且不含凭据。
- 核销幂等键是 `(coupon_id,biz_order_no)`；领券不接受客户端幂等键，以数据库事务、限领和库存条件更新保证一致性。
- 列表必须分页；统计按时间范围和索引聚合；不得以 Redis/CDN 作为接口正确性的前提。
- 本规范是待实现契约，未声明接口已可调用或性能已达标。
