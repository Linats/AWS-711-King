# 数据库设计 - 优惠券发放与核销中心

## 1. 设计基线

数据库固定为 PostgreSQL 16，由 Prisma schema 和 Prisma Migrate 管理。设计服务于单机模块化单体，不引入 Redis、分库分表或外部日志数据库。所有时间使用 `TIMESTAMPTZ`，主键使用 UUID，金额使用 `DECIMAL(10,2)`。

## 2. 实体关系

```text
users 1─n refresh_tokens
users 1─n campaigns(created_by)
campaigns 1─n coupons
users 1─n coupons
campaigns/users 1─n claim_records
users 1─n risk_records  n─0..1 claim_records
risk_rules（独立配置表）
coupons 1─n verifications
users 1─n verifications(verifier_id)
users 1─n audit_logs(actor_id)
users 1─n ai_call_logs(user_id，可空)
```

## 3. 统一枚举与状态

| 对象 | 值 | 说明 |
|---|---|---|
| 用户角色 | `admin/operator/customer/verifier` | 一个账号绑定一个角色。 |
| 活动状态 | `draft/active/paused/sold_out/expired/deleted` | `deleted` 为软删除终态。 |
| 券状态 | `claimed/verified/expired/revoked` | 券在成功领券时创建，不预生成 `available` 券。 |
| 领券结果 | `issued/pending_review/blocked/rejected` | 未发券记录的 `coupon_id` 可空。 |
| 风控决策 | `pass/review/block` | 评分边界：`<30`、`30~70`、`>70`。 |
| 审核状态 | `not_required/pending/approved/rejected` | 放行状态一次性消费。 |
| AI用途 | `recommendation/risk_assessment` | 与业务调用一一关联。 |
| AI结果 | `success/fallback/error` | `fallback` 必须有原因。 |

## 4. 表结构

### 4.1 `users`

| 字段 | 类型/约束 | 说明 |
|---|---|---|
| `id` | UUID PK | 用户标识。 |
| `username` | VARCHAR(64) UNIQUE NOT NULL | 登录名。 |
| `password_hash` | VARCHAR(255) NOT NULL | bcrypt 哈希。 |
| `role` | VARCHAR(32) CHECK | 四种固定角色。 |
| `display_name` | VARCHAR(128) NOT NULL | 展示名。 |
| `metadata` | JSONB NOT NULL DEFAULT `{}` | 偏好、标签等扩展配置。 |
| `created_at/updated_at` | TIMESTAMPTZ NOT NULL | 审计时间。 |

Seed 创建 `admin`、`operator`、`verifier`、`customer_a`、`customer_b`、`customer_c` 六个演示账号，不提供公开注册。

### 4.2 `refresh_tokens`

| 字段 | 类型/约束 | 说明 |
|---|---|---|
| `id` | UUID PK | token 记录。 |
| `user_id` | UUID FK users NOT NULL | 所属用户。 |
| `token_hash` | VARCHAR(255) UNIQUE NOT NULL | 仅保存随机 token 的哈希。 |
| `expires_at` | TIMESTAMPTZ NOT NULL | 过期时间。 |
| `revoked_at` | TIMESTAMPTZ NULL | 登出、轮换或异常时撤销。 |
| `replaced_by_id` | UUID SELF FK NULL | 轮换链路。 |
| `created_at` | TIMESTAMPTZ NOT NULL | 签发时间。 |

索引：`(user_id, revoked_at)`、`expires_at`。过期记录可由维护任务清理。

### 4.3 `campaigns`

| 字段 | 类型/约束 | 说明 |
|---|---|---|
| `id` | UUID PK | 活动标识。 |
| `name/description` | VARCHAR(256)/TEXT | 名称必填，描述可空。 |
| `coupon_type` | VARCHAR(32) NOT NULL DEFAULT `fixed` | 券类型策略键。 |
| `value` | DECIMAL(10,2) NOT NULL CHECK `>0` | 面额。 |
| `total_stock` | INTEGER NOT NULL CHECK `1..100000` | 总库存。 |
| `remaining_stock` | INTEGER NOT NULL | `0..total_stock`。 |
| `per_user_limit` | INTEGER NOT NULL CHECK `>=1` | 每用户限领。 |
| `start_time/end_time` | TIMESTAMPTZ NOT NULL | `end_time > start_time`。 |
| `status` | VARCHAR(32) NOT NULL | 活动状态。 |
| `rules/metadata` | JSONB NOT NULL DEFAULT `{}` | 券配置和展示扩展，不存风控全局规则。 |
| `created_by` | UUID FK users NOT NULL | 运营创建人。 |
| `created_at/updated_at` | TIMESTAMPTZ NOT NULL | 审计时间。 |

索引：`(status,start_time,end_time)`、`created_by`；列表默认排除 `deleted`。

### 4.4 `coupons`

| 字段 | 类型/约束 | 说明 |
|---|---|---|
| `id` | UUID PK | 券实例。 |
| `campaign_id/user_id` | UUID FK NOT NULL | 活动与持有人。 |
| `code` | VARCHAR(64) UNIQUE NOT NULL | 券码。 |
| `status` | VARCHAR(32) NOT NULL DEFAULT `claimed` | 券状态。 |
| `claimed_at/expires_at` | TIMESTAMPTZ NOT NULL | 领取与到期时间。 |
| `verified_at` | TIMESTAMPTZ NULL | 成功核销时间。 |
| `metadata` | JSONB NOT NULL DEFAULT `{}` | 券类型快照等扩展信息。 |
| `created_at/updated_at` | TIMESTAMPTZ NOT NULL | 审计时间。 |

索引：`(user_id,status,claimed_at DESC)`、`campaign_id`、`expires_at`。同用户同活动允许多张，但由事务和 `per_user_limit` 控制；限领为 1 时再次请求返回“已领取”。

### 4.5 `claim_records`

| 字段 | 类型/约束 | 说明 |
|---|---|---|
| `id` | UUID PK | 领券尝试。 |
| `campaign_id/user_id` | UUID FK NOT NULL | 活动与用户。 |
| `coupon_id` | UUID FK coupons UNIQUE NULL | 仅成功发券时填写。 |
| `result` | VARCHAR(32) NOT NULL | `issued/pending_review/blocked/rejected`。 |
| `risk_score/risk_decision` | DECIMAL(5,2)/VARCHAR(16) | 本次风控快照。 |
| `request_id` | VARCHAR(64) NOT NULL | 与日志关联。 |
| `metadata` | JSONB NOT NULL DEFAULT `{}` | 脱敏请求上下文。 |
| `created_at/updated_at` | TIMESTAMPTZ NOT NULL | 时间。 |

索引：`(campaign_id,user_id,created_at DESC)`、`(user_id,created_at DESC)`、`result`。成功记录数量用于限领校验。

### 4.6 `risk_rules`

| 字段 | 类型/约束 | 说明 |
|---|---|---|
| `id` | UUID PK | 规则标识。 |
| `code` | VARCHAR(64) UNIQUE NOT NULL | 如 `claim_frequency_10s`。 |
| `name` | VARCHAR(128) NOT NULL | 中文名称。 |
| `rule_type` | VARCHAR(32) NOT NULL | `frequency/time_window/quantity/ip_frequency`。 |
| `config` | JSONB NOT NULL | 窗口、阈值、评分或决策。 |
| `priority` | INTEGER NOT NULL | 小值先执行。 |
| `enabled` | BOOLEAN NOT NULL DEFAULT true | 是否启用。 |
| `created_at/updated_at` | TIMESTAMPTZ NOT NULL | 时间。 |

Seed 至少配置“10 秒 50 次触发 block”，并可配置频率、时段、数量规则。规则引擎按优先级执行，取最高风险结果。

### 4.7 `risk_records`

| 字段 | 类型/约束 | 说明 |
|---|---|---|
| `id` | UUID PK | 风控记录。 |
| `claim_record_id` | UUID FK claim_records NULL | 对应尝试。 |
| `user_id/campaign_id` | UUID FK NOT NULL | 主体与活动。 |
| `source` | VARCHAR(16) NOT NULL | `ai/rule`。 |
| `risk_score` | DECIMAL(5,2) CHECK `0..100` | 风险分。 |
| `decision` | VARCHAR(16) NOT NULL | `pass/review/block`。 |
| `reasons` | JSONB NOT NULL DEFAULT `[]` | 命中规则或 AI 原因。 |
| `review_status` | VARCHAR(20) NOT NULL | 审核状态。 |
| `reviewed_by/reviewed_at` | UUID FK/TIMESTAMPTZ NULL | 操作人和时间。 |
| `review_comment` | TEXT NULL | 审核理由。 |
| `approval_expires_at/approval_consumed_at` | TIMESTAMPTZ NULL | 一次性放行控制。 |
| `created_at/updated_at` | TIMESTAMPTZ NOT NULL | 时间。 |

索引：`(review_status,created_at DESC)`、`(user_id,campaign_id,approval_expires_at)`、`decision`。

### 4.8 `verifications`

| 字段 | 类型/约束 | 说明 |
|---|---|---|
| `id` | UUID PK | 核销记录。 |
| `coupon_id` | UUID FK NOT NULL | 被核销券。 |
| `verifier_id` | UUID FK users NOT NULL | 核销员。 |
| `biz_order_no` | VARCHAR(128) NOT NULL | 业务单号。 |
| `result` | VARCHAR(32) NOT NULL | 首次处理结果，成功为 `success`。 |
| `response_snapshot` | JSONB NOT NULL | 幂等重放的首次响应。 |
| `created_at` | TIMESTAMPTZ NOT NULL | 核销时间。 |

唯一约束：`UNIQUE(coupon_id,biz_order_no)`。索引：`(created_at DESC)`、`verifier_id`、`coupon_id`。券状态的条件更新保证同一券只成功核销一次。

### 4.9 `ai_call_logs`

| 字段 | 类型/约束 | 说明 |
|---|---|---|
| `id` | UUID PK | 调用标识。 |
| `request_id` | VARCHAR(64) NOT NULL | 请求追踪。 |
| `user_id` | UUID FK NULL | 发起用户。 |
| `purpose/auth_mode/model_id` | VARCHAR NOT NULL | 用途、`sdk/api_key`、模型。 |
| `input_payload/output_payload` | JSONB NOT NULL | 按 NFR-004 记录输入输出，写入前脱敏并限制大小。 |
| `duration_ms` | INTEGER NOT NULL | 调用耗时。 |
| `input_tokens/output_tokens` | INTEGER NULL | 可获得时记录。 |
| `status/fallback_reason/error_code` | VARCHAR/TEXT | 成功、降级或错误。 |
| `created_at` | TIMESTAMPTZ NOT NULL | 时间。 |

索引：`(purpose,created_at DESC)`、`status`、`request_id`。禁止存 API Key、AWS 凭据、JWT、refresh token 和密码。

### 4.10 `audit_logs`

| 字段 | 类型/约束 | 说明 |
|---|---|---|
| `id` | UUID PK | 日志标识。 |
| `request_id` | VARCHAR(64) NOT NULL | 请求追踪。 |
| `actor_id` | UUID FK users NULL | 匿名失败可空。 |
| `action` | VARCHAR(64) NOT NULL | 如 `campaign.create`、`risk.review`。 |
| `resource_type/resource_id` | VARCHAR/UUID NULL | 资源。 |
| `outcome` | VARCHAR(16) NOT NULL | `success/failure/denied`。 |
| `ip/user_agent` | VARCHAR/TEXT NULL | 脱敏上下文。 |
| `detail` | JSONB NOT NULL DEFAULT `{}` | 变更摘要，不保存秘密和完整密码字段。 |
| `created_at` | TIMESTAMPTZ NOT NULL | 时间。 |

索引：`(created_at DESC)`、`(actor_id,created_at DESC)`、`(action,created_at DESC)`、`(resource_type,resource_id)`。业务 API 不提供更新和删除审计日志的能力。

## 5. 事务与一致性

### 5.1 领券事务

- 先完成风控；仅 pass 或消费有效审核放行后开启发券事务。
- 在事务内统计成功领券数、条件更新库存、创建券、创建 `issued` 领券记录并消费审核放行。
- 条件更新语义：目标活动 `active`、当前时间有效、`remaining_stock > 0`；更新影响 0 行即失败。
- 事务失败时库存、券和记录全部回滚；唯一券码冲突只重试有限次数。

### 5.2 核销事务

- `(coupon_id,biz_order_no)` 命中直接重放 `response_snapshot`。
- 首次请求在事务内条件更新 `claimed → verified` 并创建核销记录。
- 并发唯一冲突回查记录；已被其他业务单号核销则返回已核销，不新增成功记录。

### 5.3 风控审核

- 仅 `pending` 可审核；审核更新使用条件更新避免重复处理。
- approved 产生一次性且有过期时间的放行，后续领券事务原子消费；rejected 不可消费。
- 所有审核写审计日志，记录操作人、结论、理由和时间。

## 6. 可扩展性与迁移

- 新券类型通过 `coupon_type` + `rules/metadata` + 后端策略实现，不修改核心表结构；迁移仍是唯一 schema 变更方式。
- 新风控规则通过 `risk_rules` 新增配置，不将阈值硬编码在控制器。
- 多租户仅为未来可能性，本期不加入 `tenant_id`，避免无需求的复杂度。
- 迁移必须可重复部署；seed 仅用于开发/测试，正式环境不得使用文档中的演示密码。

## 7. 数据保留与隐私

- refresh token 过期后可清理；业务、审计、AI 日志的保留期由部署配置确定，本期不自动归档。
- AI 输入输出和审计详情在写库前脱敏；展示接口再次按角色裁剪。
- 当前没有已执行迁移、数据量或性能结果；上述索引和约束需在实现及真实测试中验证。
