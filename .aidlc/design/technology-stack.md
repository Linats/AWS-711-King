# 技术栈与工程约束 - 优惠券发放与核销中心

## 1. 选型总览

| 层级 | 技术与版本策略 | 用途 | 决策理由 |
|---|---|---|---|
| 运行时 | Node.js 20 LTS | 前后端工具链、后端运行 | 与 AWS SDK 和 TypeScript 生态一致。 |
| 语言 | TypeScript 5.x | `src/backend/frontend/shared` | 共享契约和严格类型检查。 |
| 后端 | Express 4.x | REST API | 需求已确认，成熟且适合单机模块化单体。 |
| ORM/迁移 | Prisma 5.x + Prisma Migrate | 数据访问和 schema 迁移 | 类型安全、事务、PostgreSQL 支持。 |
| 数据库 | PostgreSQL 16 | 唯一持久化数据库 | JSONB、约束、事务和行级并发能力。 |
| 前端 | React 18 + Vite 5.x | SPA | 需求已确认，开发与构建简单。 |
| UI/CSS | Ant Design 5 + Tailwind CSS 3 | 组件和定制样式 | 满足响应式、主题和现代交互。 |
| 路由/状态 | React Router 6、Zustand 4、TanStack Query 5 | 路由、本地状态、服务端缓存 | 职责分离，避免重型状态框架。 |
| HTTP | Axios 1.x | 前端 API 和刷新队列 | 拦截器便于 access token 处理。 |
| 图表/动画 | Recharts 2、Framer Motion 10 | 统计与领券动画 | 与 React 集成直接。 |
| 校验 | Zod 3.x | API 入参和必要前端表单 | 统一运行时校验。 |
| 认证 | jsonwebtoken 9.x、bcrypt | JWT 和密码哈希 | 满足 NFR-005。 |
| 日志/安全 | Pino 或 Winston（二选一）、Helmet、CORS | 结构化日志与 HTTP 防护 | 实现时只选一套日志库，避免重复。 |
| AI SDK | `@aws-sdk/client-bedrock` 3.x、`@aws-sdk/client-bedrock-runtime` 3.x | 模型列表与 SDK 对话 | 与 `bedrock.service.txt` 契约一致。 |
| 测试 | Vitest/Jest（二选一）、Supertest、React Testing Library、Playwright、k6 | 单元、集成、E2E、性能 | 初始化时统一测试运行器，不并存两套。 |

实际依赖安装使用任务开始时可获得的兼容精确版本并锁定 lockfile；本文不虚构尚未安装的补丁版本。

## 2. 工程布局

```text
project-root/
├─ src/backend/    # Express、Prisma、后端测试
├─ src/frontend/   # React + Vite；sites/<role> 为四个角色站点入口，src/ 为共享代码与页面
├─ src/shared/     # DTO、枚举、错误码
└─ .aidlc/         # 需求、设计、任务和计划
```

可以使用根 npm workspace 统一脚本，但不创建 `backend/`、`frontend/` 根级平行目录。所有构建配置必须围绕上述 `src` 布局。

## 3. Bedrock 双路径

### 3.1 SDK 凭据路径

- `BedrockRuntimeClient + ConverseCommand` 调用对话；AWS 默认凭据链提供认证。
- `BedrockClient + ListFoundationModelsCommand` 仅用于 SDK 模式的文本模型列表，10 秒超时。
- 对话 60 秒超时；捕获超时、访问拒绝、上下文超限及服务错误并交给业务降级。

### 3.2 API Key 路径

- 通过原生 `fetch` 调用 `https://bedrock-runtime.{region}.amazonaws.com/model/{modelId}/converse`。
- 头为 `Authorization: Bearer <BEDROCK_API_KEY>`，对话 60 秒超时。
- 处理 400、401/403、404、429 和 5xx；API Key 不进入浏览器、数据库、普通日志或错误响应。
- API Key 模式不调用模型列表，模型 ID 来自服务端静态环境配置。

### 3.3 模式与降级配置

建议环境项：`BEDROCK_AUTH_MODE=sdk|api_key`、`AWS_REGION`、`BEDROCK_MODEL_ID`、`BEDROCK_API_KEY`（仅 api_key）。模式必须显式选择，不在失败时偷偷切换另一认证路径；失败直接进入热门推荐/规则风控，行为可预测且可审计。

## 4. 数据与并发技术约束

- 仅 PostgreSQL 16；Prisma 负责常规查询，必要的条件更新或锁定可使用参数化原生 SQL。
- 库存使用数据库事务 + 条件更新/CAS，不使用 Redis 锁。
- 核销使用事务 + `(coupon_id,biz_order_no)` 唯一约束 + 首次响应快照。
- 风控规则来自 `risk_rules`，不得只写死在控制器。
- 所有 schema 变化经 Prisma Migrate；禁止生产环境 `db push` 替代正式迁移。

## 5. 前端工程约束

- Vite 环境变量只暴露 `VITE_*`；Bedrock Key、JWT secret、数据库 URL 不得使用此前缀。
- access token 仅内存保存；refresh token 使用 HttpOnly Cookie。
- TanStack Query 管理服务端数据，Zustand 不复制活动、券和统计列表。
- Ant Design 与 Tailwind 共享设计 token；不额外引入第二套 UI 组件库或图表库。
- 浏览器支持基线：Chrome 90+、Firefox 88+、Safari 14+、Edge 90+。

## 6. 单机开发与部署

- 开发依赖：Node.js 20、npm 10、PostgreSQL 16。本期可以直接安装 PostgreSQL；若使用容器，仅用于本机数据库便利，不扩展为服务编排架构。
- 开发端口：前端四个角色站点分别为 5173（用户主站）、5174（运营控制台）、5175（核销终端）、5176（数据与审计中心）；后端 3000、数据库 5432。
- 四个站点是四个独立进程：`npm run dev:frontend` 一次拉起全部四个（Ctrl+C 一起停止），单独调试用 `npm run dev:site:<role>`。跨站超链要求目标端口已有服务，否则链接打不开。
- 正式单机运行四份前端静态产物（`src/frontend/dist/<site>`）、一个 Node.js 后端实例和 PostgreSQL 16；反向代理可选，用于把四个站点挂到不同域名或路径。
- 后端 `CORS_ORIGIN` 为逗号分隔的多 origin 列表，需覆盖全部四个站点地址。
- 不采用 Kubernetes、负载均衡、PM2 cluster、Redis、CDN、Prometheus/Grafana、ELK 或第三方错误平台作为本期必需技术。

## 7. 配置与秘密

后端配置至少包括：`NODE_ENV`、`PORT`、`DATABASE_URL`、`JWT_ACCESS_SECRET`、access/refresh 有效期、`AWS_REGION`、`BEDROCK_AUTH_MODE`、`BEDROCK_MODEL_ID`，以及 API Key 模式下的 `BEDROCK_API_KEY`。仓库只提交 `.env.example` 占位符，不提交真实密码、token 或 AWS 凭据。

正式环境演示账号密码必须替换；seed 中密码经 bcrypt 哈希。日志输出需要秘密字段屏蔽。

## 8. 质量门禁

每个任务按影响范围执行：

1. TypeScript 类型检查。
2. ESLint/格式检查。
3. 后端单元与 API 集成测试；前端组件测试。
4. Prisma schema 校验和迁移测试。
5. 核心流程 E2E。
6. 库存并发、幂等核销、AI 降级、权限和性能专项测试。

构建/测试命令由 T-001 在真实 package scripts 中确定，后续计划引用实际命令，不预先声称结果。

## 9. 明确排除

- 微服务、Kubernetes、服务网格、消息队列、Redis 缓存/分布式锁、CDN。
- 批量活动/核销、优惠券分享奖励、离线核销、支付、用户自助注册。
- 尚无实现依据的“现有覆盖率、Bundle 大小、TPS、可用性、上线日期或技术债务”结论。
