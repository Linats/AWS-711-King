# 正式实现任务 - 优惠券发放与核销中心

## 审阅状态

- 状态：已认可
- 最近审阅：本会话；用户于本会话要求分析开发文档并完成项目，视为认可该计划并授权继续实现。
- 范围基线：主规格、`.aidlc/requirements/` 与 2026-07-29 完成一致性评审的六份设计文档。
- 当前实现：`src/shared`、`src/backend`、`src/frontend` 已存在可构建代码；前端已按角色拆分为四个独立站点。各任务勾选状态仍以其验收标准的真实验证证据为准，尚未逐项复核，故保持未完成。
- 本次修改边界：文档闭环已建立；前端站点拆分见下节“前端站点拆分基线”。

## 执行规则

- 每项任务只有在交付物存在、验收标准满足并记录真实验证结果后才能勾选。
- 文件范围表示该任务允许创建/修改的主要路径；如需越界，先更新任务及追踪矩阵。
- 依赖版本与脚本由 T-001 以实际 lockfile/package scripts 固化；后续使用真实命令，不把计划命令当成已执行证据。
- 范围外：微服务、Kubernetes、Redis/CDN、支付、管理员自助注册、批量操作、分享、离线核销和管理员用户管理。customer/operator/verifier 自助注册已纳入范围，见 FR-011/US-013。

## 前端站点拆分基线

前端不再是单一 SPA，而是四个相互独立的站点，每个站点独立入口、独立端口、独立静态产物，且只打包本角色的页面代码：

| 站点 | 角色 | 开发端口 | 产物 | 入口 |
|---|---|---|---|---|
| 优惠券中心（主站） | customer | 5173 | `src/frontend/dist/customer` | `src/frontend/sites/customer/` |
| 运营控制台 | operator | 5174 | `src/frontend/dist/operator` | `src/frontend/sites/operator/` |
| 核销终端 | verifier | 5175 | `src/frontend/dist/verifier` | `src/frontend/sites/verifier/` |
| 数据与审计中心 | admin | 5176 | `src/frontend/dist/admin` | `src/frontend/sites/admin/` |

- 四个站点是四个独立进程：`npm run dev:frontend` 一次拉起全部四个（脚本 `src/frontend/scripts/dev-sites.mjs`），`npm run dev:site:<role>` 单独启动；只起主站时其余站点的超链打不开。
- 主站承担跨站导航职责：首页与登录页提供其余三个站点的超链，其余站点提供返回主站与切换站点入口；地址由 `VITE_SITE_<ROLE>_URL` 配置。
- 站点差异化文案（名称、受众、定位、hero、登录提示、可用账号、主题色）集中在 `src/frontend/src/app/site-config.tsx`；站点骨架复用 `src/app/SiteApp.tsx`，页面位于 `src/pages/<role>/`。
- 站点之间不共享登录态（不同 origin）；后端 `CORS_ORIGIN` 为逗号分隔列表，需覆盖四个站点。
- 影响任务：T-010（基座与路由改为“站点骨架 + 四站入口”）、T-012~T-016（各角色页面归属各自站点）、T-017（E2E 需按站点分别执行）。文件范围相应扩展到 `src/frontend/sites/**` 与 `src/frontend/vite.*.config.ts`。

## 任务

### T-001 工程骨架与单机开发基础
- [ ] 状态：未完成
- 目标：按固定根目录建立可构建、可测试的 TypeScript 前后端分离工程。
- 范围：npm workspace/根脚本、`src/backend` Express 基座、`src/frontend` React+Vite 基座、`src/shared` 公共契约、环境变量示例、lint/格式/测试基座。
- 不包含：数据库业务表、业务 API、业务页面、容器编排和 CI/CD 平台。
- Depends on：无
- 需求映射：NFR-001、NFR-002、NFR-005、NFR-007；全部 FR 的工程前置。
- 需求引用：`.aidlc/requirements/non-functional-requirements.md:9`、`:23`、`:65`、`:122`。
- 设计引用：`.aidlc/design/system-architecture.md:30`、`.aidlc/design/technology-stack.md:25`。
- 文件范围：根 `package.json`/lockfile/TypeScript/ESLint/Prettier 配置；`src/backend/**`、`src/frontend/**`、`src/shared/**`；`.env.example`。
- [Reference] 外部 API 文档：无待补引用；实现时使用所锁定依赖的官方契约。
- 实现要点：固定 `src/backend|frontend|shared`；Express 提供基础 app 和 `/api/v1/health` 外壳；前后端独立构建；选定且只保留一套测试运行器和一套日志库；秘密仅用占位符。
- 验收标准：
  - 前端和后端开发进程可分别启动，生产构建成功。
  - TypeScript、lint、格式检查和空测试套件可运行。
  - `/api/v1/health` 在无业务表时返回进程状态；目录中不存在根级 `backend/`、`frontend/` 平行实现。
- 验证方式：执行 T-001 实际创建的 install、typecheck、lint、test、build 和双端 smoke 命令并记录输出。
- 交付物：工程配置、三个 `src` 子工程基座、公共响应/错误/角色类型、环境示例。

### T-002 PostgreSQL 数据模型、迁移与 Seed
- [ ] 状态：未完成
- 目标：实现完整 Prisma schema、初始迁移、索引约束和 6 账号开发 Seed。
- 范围：users、refresh_tokens、campaigns、coupons、claim_records、verifications、risk_rules、risk_records、ai_call_logs、audit_logs。
- 不包含：HTTP API 和业务页面。
- Depends on：T-001
- 需求映射：FR-001~FR-010；NFR-001、NFR-003、NFR-004、NFR-005、NFR-007。
- 需求引用：`.aidlc/requirements/functional-requirements.md:9-161`、`.aidlc/requirements/non-functional-requirements.md:9`、`:37`、`:51`、`:65`、`:122`。
- 设计引用：`.aidlc/design/database-design.md:23`、`:36`、`:195`；`.aidlc/design/technology-stack.md:56`。
- 文件范围：`src/backend/prisma/**`、`src/backend/src/db/**`、数据库测试夹具。
- [Reference] 外部 API 文档：无待补引用。
- 实现要点：PostgreSQL 16；Prisma Migrate；JSONB 扩展字段；refresh token 哈希；库存约束；`(coupon_id,biz_order_no)` 唯一键；AI/审计日志脱敏字段；Seed 含 6 账号和“10秒50次 block”规则。
- 验收标准：
  - 空数据库可迁移，迁移可在全新测试库重放。
  - Seed 后 6 个账号覆盖 4 个角色，密码为 bcrypt 哈希。
  - 约束拒绝负库存、非法枚举、重复券码和重复幂等键。
  - `risk_rules`、`ai_call_logs`、`audit_logs`、`refresh_tokens` 均可读写且索引存在。
- 验证方式：Prisma validate/generate/migrate、测试库重建、Seed 查询和约束集成测试。
- 交付物：`schema.prisma`、初始 migration、seed、数据库访问基座和测试夹具。

### T-003 认证、Refresh Token、RBAC 与平台中间件
- [ ] 状态：未完成
- 目标：实现登录、当前用户、token 刷新/轮换/撤销、角色鉴权和统一请求基础设施。
- 范围：`/auth/register|login|refresh|logout|me`、`GET /admin/audit-logs`、JWT、bcrypt、refresh Cookie、请求 ID、Zod 校验、错误映射、结构化请求日志、审计写入与管理员分页查询。
- 不包含：管理员账号自助注册、管理员用户 CRUD 和业务模块。
- Depends on：T-002
- 需求映射：FR-001、US-012；NFR-005、NFR-007。
- 需求引用：`.aidlc/requirements/functional-requirements.md:9`、`.aidlc/requirements/user-stories.md:106`、`.aidlc/requirements/non-functional-requirements.md:65`、`:122`。
- 设计引用：`.aidlc/design/system-architecture.md:59`、`:90`；`.aidlc/design/api-specification.md:29`、`:92`、`:108`；`.aidlc/design/frontend-design.md:45`。
- 文件范围：`src/backend/src/app/**`、`middleware/**`、`modules/auth/**`、`modules/audit/**`、`src/shared/**`、对应后端测试。
- [Reference] 外部 API 文档：无待补引用。
- 实现要点：access token 短期有效；refresh token 只存哈希且每次轮换；重放已轮换 token 触发撤销；Cookie 安全属性按环境设置；角色只信任服务端；秘密字段日志屏蔽。
- 验收标准：
  - 6 个账号可登录，错误凭据为 401；角色声明与数据库一致。
  - refresh 成功轮换，旧 token 重放失败；logout 后不能继续刷新。
  - 无 token 为 401，角色不符为 403；登录、登出、刷新和拒绝有脱敏审计。
  - `/admin/audit-logs` 仅 admin 可按操作人、动作、资源、结果和时间分页查询，响应不泄露秘密。
  - `/auth/register` 仅接受 customer/operator/verifier；注册 admin 返回 403 且不创建账号；重复账号 409；弱密码或非法账号名 400；注册成功与被拒绝均写审计日志。
- 验证方式：认证服务单元测试、Supertest 集成测试、数据库 refresh/audit 记录核对。
- 交付物：认证模块、RBAC/请求/错误中间件、审计基础服务和测试。

### T-004 活动管理后端
- [ ] 状态：未完成
- 目标：实现运营活动 CRUD、合法状态流转和角色化活动查询。
- 范围：`GET/POST /campaigns`、`GET/PUT/DELETE /campaigns/:id`、`PATCH /campaigns/:id/status`。
- 不包含：领券、统计、批量操作。
- Depends on：T-003
- 需求映射：FR-002、US-001、US-002、US-003；NFR-005、NFR-007。
- 需求引用：`.aidlc/requirements/functional-requirements.md:25`、`.aidlc/requirements/user-stories.md:18`、`:26`、`:34`。
- 设计引用：`.aidlc/design/database-design.md:66`、`.aidlc/design/api-specification.md:37`、`:112`。
- 文件范围：`src/backend/src/modules/campaigns/**`、公共活动 DTO、对应后端测试。
- [Reference] 外部 API 文档：无待补引用。
- 实现要点：Zod 校验；库存/时间/限领约束；状态机；软删除；分页；customer 只见可领取活动；所有变更写审计。
- 验收标准：完整活动可创建为草稿；非法参数被 400 拒绝；分页总数正确；越权 403；非法状态流转 409；软删除不出现在默认列表。
- 验证方式：服务单元测试、API 集成测试、Seed 数据分页与审计对账。
- 交付物：活动路由、服务、校验、DTO 和测试。

### T-005 规则风控、原子领券与券包后端
- [ ] 状态：未完成
- 目标：在 Bedrock 不可用的基础情形下，以 `risk_rules` 保护原子领券，并提供券包查询。
- 范围：规则引擎、`POST /campaigns/:id/claim`、`GET /my-coupons`、库存 CAS、限领、券码、领券/风控/审计记录。
- 不包含：AI 风险评分和人工审核 API（T-009）、推荐 API（T-008）。
- Depends on：T-004
- 需求映射：FR-003、FR-007（规则降级部分）、FR-008；US-004、US-005；NFR-003、NFR-004、NFR-005。
- 需求引用：`.aidlc/requirements/functional-requirements.md:41`、`:105`、`:121`；`.aidlc/requirements/user-stories.md:42`、`:50`；`.aidlc/requirements/non-functional-requirements.md:37`、`:51`。
- 设计引用：`.aidlc/design/system-architecture.md:65`、`.aidlc/design/database-design.md:85`、`:100`、`:195`、`.aidlc/design/api-specification.md:118`、`:134`。
- 文件范围：`src/backend/src/modules/claims/**`、`modules/risk/rule-engine*`、共享券/领券 DTO、并发与集成测试。
- [Reference] 外部 API 文档：无待补引用。
- 实现要点：规则按 priority 执行并取最高风险；10秒50次 block；pass 后事务内校验成功领取数、条件扣库存、创建券和记录；review/block 不扣库存；券包映射四种展示状态。
- 验收标准：
  - 库存1时50并发只有1次成功，库存不为负且无孤儿券/记录。
  - 重复、超限、售罄返回确定错误且不改库存。
  - 10秒50次触发 block；规则修改无需改代码。
  - 券包四状态筛选、倒序和分页正确。
- 验证方式：规则单元测试、事务集成测试、50并发脚本、数据库不变量查询。
- 交付物：领券/券包 API、规则引擎、并发脚本和测试。

### T-006 幂等核销与记录查询后端
- [ ] 状态：未完成
- 目标：实现在线核销、首次响应重放和核销记录筛选分页。
- 范围：`POST /verify`、`GET /verifications`、券状态事务、幂等快照、活动/时间/用户筛选、审计。
- 不包含：离线核销和专用扫码硬件集成。
- Depends on：T-005
- 需求映射：FR-004、FR-009；US-007、US-008；NFR-003、NFR-005、NFR-006。
- 需求引用：`.aidlc/requirements/functional-requirements.md:57`、`:135`；`.aidlc/requirements/user-stories.md:66`、`:74`。
- 设计引用：`.aidlc/design/system-architecture.md:75`、`.aidlc/design/database-design.md:195`、`.aidlc/design/api-specification.md:90`。
- 文件范围：`src/backend/src/modules/verifications/**`、共享核销 DTO、幂等/并发测试。
- [Reference] 外部 API 文档：无待补引用。
- 实现要点：按券码定位券；同券+同业务单号重放首次快照；条件状态更新；唯一冲突回查；不同业务单号不发生键冲突；过期不可核销。
- 验收标准：首次核销成功并生成一条记录；相同键重复3次返回同一 ID/首次时间；过期券拒绝；不同业务单号不因唯一键冲突；筛选分页准确。
- 验证方式：服务/API 集成测试、并发重复核销测试、数据库记录和券状态对账。
- 交付物：核销路由/服务、查询、审计和测试。

### T-007 统计后端
- [ ] 状态：未完成
- 目标：提供系统级和活动级统计，并统一计算口径。
- 范围：`GET /stats/overview`、`GET /stats/campaigns/:id`、时间范围、趋势、状态分布、近期风险告警。
- 不包含：实时推送、导出和缓存服务。
- Depends on：T-005、T-006
- 需求映射：FR-005、US-009；NFR-006。
- 需求引用：`.aidlc/requirements/functional-requirements.md:73`、`.aidlc/requirements/user-stories.md:82`、`.aidlc/requirements/non-functional-requirements.md:95`。
- 设计引用：`.aidlc/design/api-specification.md:37`、`:90`、`.aidlc/design/frontend-design.md:53`。
- 文件范围：`src/backend/src/modules/stats/**`、共享统计 DTO、聚合测试。
- [Reference] 外部 API 文档：无待补引用。
- 实现要点：领取数仅计 issued，核销数仅计 success；分母0返回0；使用索引和聚合查询，不引入 Redis。
- 验收标准：固定夹具下每项指标与 SQL/数据库实际值一致；时间筛选正确；空数据结构稳定；admin/operator 权限符合端点定义。
- 验证方式：聚合单元/集成测试、夹具手工对账、统计查询计时。
- 交付物：统计路由、服务、DTO 和测试。

### T-008 Bedrock 双路径、AI 调用日志与推荐后端
- [ ] 状态：未完成
- 目标：实现 SDK/API Key 两条独立 Bedrock 路径、可追溯日志和热门推荐降级。
- 范围：Bedrock 适配器、`GET /recommendations`、Prompt/解析、10s/60s 超时、`ai_call_logs`、热门 Top3 降级。
- 不包含：AI 风控流程（T-009）和前端推荐区（T-014）。
- Depends on：T-002、T-004
- 需求映射：FR-006、US-006；NFR-004、NFR-005、NFR-006。
- 需求引用：`.aidlc/requirements/functional-requirements.md:89`、`.aidlc/requirements/user-stories.md:58`、`.aidlc/requirements/non-functional-requirements.md:51`、`:95`。
- 设计引用：`.aidlc/design/system-architecture.md:80`、`.aidlc/design/technology-stack.md:37`、`.aidlc/design/api-specification.md:90`。
- 文件范围：`src/backend/src/integrations/bedrock/**`、`modules/recommendations/**`、AI 日志服务、配置、共享推荐 DTO、测试。
- [Reference] 外部 API 文档：本地 `bedrock.service.txt` 为行为参考；实现时核对锁定 AWS SDK 官方类型。
- 实现要点：认证模式显式选择；API Key 仅服务端；不在失败时切换凭据模式；超时/认证/限流/空输出/解析错误均降级；每次尝试记录脱敏输入输出、耗时、模型、token 和原因。
- 验收标准：两路径适配器契约测试通过；正常响应含非空推荐和理由；故障返回规则推荐；无可用活动返回真实空态；数据库/日志无 Key、凭据、JWT 或密码。
- 验证方式：适配器单元测试、HTTP/SDK mock 契约测试、断路/超时集成测试；有凭据时分别执行真实 smoke test并如实记录。
- 交付物：Bedrock 适配器、推荐 API、AI 日志、降级和测试。

### T-009 AI 风控与人工审核后端
- [ ] 状态：未完成
- 目标：将 AI 风险评分接入领券，并完成待审核列表、放行/拒绝和一次性放行消费。
- 范围：AI 风控评估、评分边界、`GET /risk/records`、`POST /risk/records/:id/review`、规则降级、审核审计、领券事务消费放行。
- 不包含：支付风控、设备指纹平台和外部告警平台。
- Depends on：T-005、T-008
- 需求映射：FR-007、FR-010；US-010、US-011；NFR-001、NFR-004、NFR-005、NFR-007。
- 需求引用：`.aidlc/requirements/functional-requirements.md:105`、`:149`；`.aidlc/requirements/user-stories.md:90`、`:98`。
- 设计引用：`.aidlc/design/system-architecture.md:65`、`.aidlc/design/database-design.md:195`、`.aidlc/design/api-specification.md:90`。
- 文件范围：`src/backend/src/modules/risk/**`、领券服务集成点、共享风险 DTO、对应测试。
- [Reference] 外部 API 文档：沿用 T-008 Bedrock 适配器，无新增外部契约。
- 实现要点：`<30 pass`、`30~70 review`、`>70 block`；AI 异常立即规则降级；pending 审核条件更新；approve 生成有限期一次性放行；用户重试时在发券事务中消费。
- 验收标准：评分边界正确；AI 关闭后规则仍拦截10秒50次；review 不扣库存；放行后可重试领取且放行只能消费一次；拒绝/重复审核正确；操作人时间和审计完整。
- 验证方式：评分/降级单元测试、审核 API 集成测试、审核与领券并发测试、审计/库存对账。
- 交付物：AI 风控服务、审核 API、领券集成、审计和测试。

### T-010 前端站点骨架、主题、路由与 API 客户端
- [ ] 状态：未完成
- 目标：建立四个角色站点共用的骨架、响应式主题、查询缓存和可靠 API 客户端，并让每个站点只加载本角色路由。
- 范围：四站入口（`sites/<role>/index.html` + `main.tsx`）与四份 Vite 配置、站点定义与角色化文案、跨站超链组件、React Router、站点布局、AntD+Tailwind 主题、亮暗切换、TanStack Query、Axios、错误边界、Toast、骨架/空/错误组件。
- 不包含：业务页面内容和登录表单。
- Depends on：T-001
- 需求映射：NFR-002、NFR-005；全部 US 的前端前置。
- 需求引用：`.aidlc/requirements/non-functional-requirements.md:23`、`:65`。
- 设计引用：`.aidlc/design/frontend-design.md:7`、`:28`、`:53`、`.aidlc/design/technology-stack.md:64`。
- 文件范围：`src/frontend/sites/**`、`src/frontend/vite.site.ts`、`src/frontend/vite.*.config.ts`、`src/frontend/src/app/**`、`components/common/**`、`services/api-client*`、`stores/ui*`、`styles/**`、前端测试。
- [Reference] 外部 API 文档：无待补引用。
- 实现要点：每站只注册本角色路由，其他角色路径为 404；账号角色与站点不符时提示并给出正确站点链接；站点主色通过 CSS 变量注入，避免复制四套样式；三档响应式布局；暗色；reduced-motion；统一状态组件；公共 DTO 从 `src/shared` 导入；不加入范围外菜单。
- 验收标准：四个站点可分别启动并各自构建出独立产物；站内导航可用，跨站超链可达；亮暗和三档布局正常；公共 loading/empty/error/retry 可演示；前端构建和组件测试通过。
- 验证方式：组件测试、路由测试、四份 Vite build、四端口并行 smoke、桌面/移动检查。
- 交付物：四站入口与构建配置、站点定义与文案层、共享骨架/布局/主题、API/Query 配置、通用状态组件和测试。

### T-011 登录、自助注册、会话恢复与角色导航前端
- [ ] 状态：未完成
- 目标：实现登录、三角色自助注册、内存 access token、refresh Cookie 会话恢复、单刷新队列和角色跳转。
- 范围：`/login`、`/register`（customer/operator/verifier 站点）、auth store/service、RequireAuth/RoleGuard、401 刷新与登出。
- 不包含：角色自选下拉（注册页角色由站点固定）、管理员站点注册入口。
- Depends on：T-003、T-010
- 需求映射：FR-001、FR-011；US-012、US-013；NFR-002、NFR-005。
- 需求引用：`.aidlc/requirements/functional-requirements.md:9`、`:149`、`.aidlc/requirements/user-stories.md:106`。
- 设计引用：`.aidlc/design/frontend-design.md:45`、`.aidlc/design/api-specification.md:92`、`:108`。
- 文件范围：`src/frontend/src/pages/auth/**`、`src/frontend/src/app/SiteApp.tsx`、路由守卫、auth store/service、对应测试。
- [Reference] 外部 API 文档：无待补引用。
- 实现要点：登录表单只收用户名密码；注册表单角色由站点固定且客户端复用 `src/shared` 的账号/密码规则；access token 不进 localStorage；启动 refresh 恢复；并发401只触发一次刷新；失败清缓存回登录。
- 验收标准：6账号均可登录并进入正确首页；三个站点可完成注册并直接进入工作台；管理员站点无注册入口且 `/register` 不可用；错误提示清晰；角色菜单不同；刷新页面可恢复；登出或refresh失败后受保护页不可访问。
- 验证方式：组件/路由测试、认证与注册 E2E、浏览器 Cookie 和 storage 检查。
- 交付物：登录页、注册页、认证状态/服务、守卫、刷新协调和测试。

### T-012 运营端活动与风控审核页面
- [ ] 状态：未完成
- 目标：让 operator 完成活动管理和风控人工审核。
- 范围：运营首页、活动列表/创建/编辑、状态操作、风控审核列表与详情、放行/拒绝。
- 不包含：批量操作、导出和统计管理页。
- Depends on：T-004、T-009、T-011
- 需求映射：FR-002、FR-010；US-001、US-002、US-011；NFR-002。
- 需求引用：`.aidlc/requirements/functional-requirements.md:25`、`:149`；`.aidlc/requirements/user-stories.md:18`、`:26`、`:98`。
- 设计引用：`.aidlc/design/frontend-design.md:53`、`.aidlc/design/api-specification.md:112`。
- 文件范围：`src/frontend/src/pages/operator/**`、`features/campaigns/**`、`features/risk/**`、相关组件和测试。
- [Reference] 外部 API 文档：无待补引用。
- 实现要点：分页/筛选；表单客户端校验；状态按钮按状态显示；审核二次确认和理由；完整加载/空/错/成功状态；缓存失效。
- 验收标准：活动 CRUD/状态流程可在浏览器完成；非法字段反馈正确；pending 可放行/拒绝并刷新；无批量入口；移动端可用。
- 验证方式：组件测试和 operator E2E。
- 交付物：运营页面、活动/风险前端模块和测试。

### T-013 用户端活动领券与券包页面
- [ ] 状态：未完成
- 目标：让 customer 浏览活动、领券并管理券包，覆盖所有反馈状态。
- 范围：customer 首页活动列表、领券按钮/动画、review/block/售罄反馈、券详情、券包四状态筛选。
- 不包含：推荐展示（T-014）、分享和离线能力。
- Depends on：T-005、T-009、T-011
- 需求映射：FR-003、FR-007、FR-008；US-003、US-004、US-005；NFR-002。
- 需求引用：`.aidlc/requirements/functional-requirements.md:41`、`:105`、`:121`；`.aidlc/requirements/user-stories.md:34`、`:42`、`:50`。
- 设计引用：`.aidlc/design/frontend-design.md:53`、`.aidlc/design/api-specification.md:118`、`:134`。
- 文件范围：`src/frontend/src/pages/customer/**`、`features/claims/**`、`features/coupons/**`、CouponCard/动画组件和测试。
- [Reference] 外部 API 文档：无待补引用。
- 实现要点：成功后使活动/券包缓存失效；动画使用 transform/opacity 并尊重 reduced-motion；review 不显示领券成功；四状态映射由 API 契约驱动。
- 验收标准：正常、重复、超限、售罄、review、block 均有正确反馈；成功券出现在券包；筛选/排序正确；动画与移动布局可用。
- 验证方式：组件测试、customer E2E、浏览器性能和响应式检查。
- 交付物：customer 页面、领券/券包组件、动画和测试。

### T-014 AI/规则推荐前端展示
- [ ] 状态：未完成
- 目标：展示推荐券、理由和真实来源，并复用领券能力。
- 范围：customer 首页“为你推荐”、AI/热门标签、骨架、空态、错误重试、推荐领券。
- 不包含：前端直接调用 Bedrock 或伪造推荐理由。
- Depends on：T-008、T-013
- 需求映射：FR-006、US-006；NFR-002、NFR-004。
- 需求引用：`.aidlc/requirements/functional-requirements.md:89`、`.aidlc/requirements/user-stories.md:58`。
- 设计引用：`.aidlc/design/frontend-design.md:53`、`.aidlc/design/api-specification.md:90`。
- 文件范围：`src/frontend/src/features/recommendations/**`、customer 首页集成、测试。
- [Reference] 外部 API 文档：无待补引用。
- 实现要点：按 `source=ai|rule` 显示不同标签；空活动不伪造数据；领券复用 T-013 mutation 和缓存策略。
- 验收标准：推荐列表和理由正确；AI降级时标为热门推荐；加载/空/错态完整；推荐券可领取。
- 验证方式：组件测试、AI/降级 mock E2E、customer 流程回归。
- 交付物：推荐组件、首页集成和测试。

### T-015 核销端操作与历史页面
- [ ] 状态：未完成
- 目标：让 verifier 在线输入券码核销并查询历史。
- 范围：券码和业务单号输入、可选浏览器在线扫码填充、结果反馈、核销历史筛选分页。
- 不包含：离线核销、专用扫码硬件承诺、批量核销。
- Depends on：T-006、T-011
- 需求映射：FR-004、FR-009；US-007、US-008；NFR-002。
- 需求引用：`.aidlc/requirements/functional-requirements.md:57`、`:135`；`.aidlc/requirements/user-stories.md:66`、`:74`。
- 设计引用：`.aidlc/design/frontend-design.md:53`、`.aidlc/design/api-specification.md:90`。
- 文件范围：`src/frontend/src/pages/verifier/**`、`features/verifications/**`、结果组件和测试。
- [Reference] 外部 API 文档：如实现浏览器扫码，任务开始时核对所选浏览器 API/库；手工输入不依赖外部引用。
- 实现要点：手工输入始终可用；防重复提交；幂等重放标识；成功/过期/不存在/已核销明确区分；历史筛选与分页。
- 验收标准：正常和幂等核销流程完整；错误状态准确；历史筛选分页正确；无摄像头环境不影响手工核销；无离线队列。
- 验证方式：组件测试、verifier E2E、无摄像头 smoke。
- 交付物：核销/历史页面、在线扫码增强（若采用）、测试。

### T-016 管理端统计、风控告警与审计日志页面
- [ ] 状态：未完成
- 目标：让 admin 查看统计、异常风控和审计日志。
- 范围：admin 首页、统计卡片/时间筛选/Recharts、风控告警只读列表、`/admin/audit-logs` 筛选分页与详情摘要。
- 不包含：用户管理、数据导出、外部告警平台。
- Depends on：T-003、T-007、T-009、T-011
- 需求映射：FR-005、FR-007；US-009、US-010；NFR-002、NFR-005、NFR-007。
- 需求引用：`.aidlc/requirements/functional-requirements.md:73`、`:105`；`.aidlc/requirements/user-stories.md:82`、`:90`；`.aidlc/requirements/non-functional-requirements.md:122`。
- 设计引用：`.aidlc/design/frontend-design.md:7`、`:53`、`.aidlc/design/api-specification.md:37`。
- 文件范围：`src/frontend/src/pages/admin/**`、`features/stats/**`、`features/audit/**`、风控告警组件和测试。
- [Reference] 外部 API 文档：无待补引用。
- 实现要点：空数据使用0和空图；时间筛选驱动 API；审计详情不展示秘密；风险列表只读；不出现用户管理入口。
- 验收标准：统计与后端数据一致；时间筛选和图表正确；告警可查看；审计筛选分页正确且其他角色不可见；移动/暗色布局可用。
- 验证方式：admin 组件/E2E、数据库统计对账、RBAC E2E、响应式检查。
- 交付物：admin 页面、统计图表、告警与审计模块和测试。

### T-017 全链路、并发、安全与非功能验收
- [ ] 状态：未完成
- 目标：在真实运行环境验证 FR、NFR、US，修复缺陷并形成可追溯证据。
- 范围：静态检查、迁移、单元/API/组件/E2E、并发、AI降级、Bedrock smoke、安全、性能、响应式和回归。
- 不包含：没有凭据时伪造真实 Bedrock 成功、生产集群压测和范围外功能。
- Depends on：T-001~T-016
- 需求映射：FR-001~FR-010、NFR-001~NFR-007、US-001~US-012。
- 需求引用：`.aidlc/requirements/functional-requirements.md:9-161`、`.aidlc/requirements/non-functional-requirements.md:9-147`、`.aidlc/requirements/user-stories.md:18-112`。
- 设计引用：`.aidlc/design/traceability-matrix.md:3`、`.aidlc/plan/test-plan.md:1`。
- 文件范围：`src/backend/tests/**`、`src/frontend/**` 测试、E2E/性能脚本；缺陷修复仅限受影响源码；`.aidlc/plan/test-plan.md` 执行证据。
- [Reference] 外部 API 文档：按实际测试工具与 Bedrock 凭据模式核对官方契约。
- 实现要点：按 test-plan 执行；每个失败记录复现和根因；修复后重跑失败项和受影响回归；记录硬件、数据量、并发、命令和原始摘要。
- 验收标准：
  - 10项 FR 与12项 US 的 P0/P1流程有真实通过证据，无未解决 P0/P1 缺陷。
  - 库存1/50并发仅1成功；幂等核销一致；AI关闭后推荐/风控降级；6账号和四角色权限正确。
  - `/admin/audit-logs`、AI日志、请求ID、refresh轮换与秘密屏蔽验证通过。
  - NFR-006 实测达到领券P99<500ms、核销P99<200ms、统计<1s、AI推荐<5s，或如实记录阻塞并保持任务未完成。
  - 响应式、暗色、动画/降动效和加载/空/错态完成浏览器验收。
- 验证方式：执行 `.aidlc/plan/test-plan.md` 全部适用项目，并将日期、环境、命令和结果写回；有 Bedrock 凭据时分别做 SDK/API Key smoke，无凭据时明确未验证。
- 交付物：自动化测试、并发/性能脚本、真实测试记录、缺陷与回归证据。

## 任务覆盖检查

| 检查项 | 结论 |
|---|---|
| 唯一编号 | T-001~T-017 连续且无重复 |
| FR 覆盖 | FR-001~FR-010 均映射至少一个实现任务和 T-017 |
| NFR 覆盖 | NFR-001~NFR-007 均有设计、实现任务和验证任务 |
| US 覆盖 | US-001~US-012 均映射角色页面/流程和 T-017 |
| 依赖 | 前置能力先于使用方，无循环依赖 |
| 测试状态 | 所有任务未完成，未虚构执行结果 |
