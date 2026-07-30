# 前端设计 - 优惠券发放与核销中心

## 1. 基线与边界

前端固定使用 React 18 + TypeScript + Vite，代码位于根目录 `src/frontend`，共享 DTO/枚举来自 `src/shared`。采用 Ant Design、Tailwind CSS、Zustand、TanStack Query、Axios、React Router、Recharts 和 Framer Motion。前端实现 customer/operator/verifier 三个站点的自助注册（管理员站点无注册入口），不实现批量活动操作、分享、离线核销或未定义的管理员用户管理。

前端按角色拆分为**四个相互独立的站点**，每个站点独立入口、独立端口、独立构建产物，只包含本角色的页面代码：

| 站点 | 角色 | 定位 | 开发端口 | 产物目录 |
|---|---|---|---|---|
| 优惠券中心（主站） | customer | 面向普通用户领券用券，并提供其他三个站点的超链入口 | 5173 | `dist/customer` |
| 运营控制台 | operator | 活动全生命周期与风控人工审核 | 5174 | `dist/operator` |
| 核销终端 | verifier | 券码核销与核销记录 | 5175 | `dist/verifier` |
| 数据与审计中心 | admin | 指标、风控告警只读与审计日志 | 5176 | `dist/admin` |

四个站点是四个独立进程，各自监听自己的端口：开发时用 `npm run dev:frontend` 一次启动全部四个，或用 `npm run dev:site:<role>` 单独启动；只启动主站时其余站点的超链无法打开。生产部署需要四份静态产物分别由域名/端口提供服务。

## 2. 信息架构与路由

各站点只注册自己角色的路由，其他角色的路径在本站点表现为 404；路径保留角色前缀以保持与下表一致。

| 路由 | 站点/角色 | 页面职责 | 需求/故事 |
|---|---|---|---|
| `/login` | 各站点公开 | 登录、错误反馈、角色不匹配引导至正确站点 | FR-001、US-012 |
| `/register` | customer、operator、verifier 站点公开 | 自助注册；角色由站点固定，不可自选。admin 站点不挂载该路由 | FR-011、US-013 |
| `/customer` | customer | 可领取活动、AI/规则推荐、领券 | FR-003/006/007、US-003/004/006 |
| `/customer/my-coupons` | customer | 券包状态筛选与排序 | FR-008、US-005 |
| `/customer/coupons/:id` | customer | 已有券详情 | FR-008 |
| `/operator` | operator | 运营概览和入口 | FR-002/010 |
| `/operator/campaigns` | operator | 活动分页列表与状态操作 | FR-002、US-001/002 |
| `/operator/campaigns/new` | operator | 创建活动 | FR-002、US-001 |
| `/operator/campaigns/:id` | operator | 详情与编辑 | FR-002、US-002 |
| `/operator/risk-review` | operator | 待审核记录、放行/拒绝 | FR-010、US-011 |
| `/verifier` | verifier | 在线输入券码；可选浏览器扫码增强 | FR-004、US-007 |
| `/verifier/history` | verifier | 核销记录筛选与分页 | FR-009、US-008 |
| `/admin` | admin | 统计概览和近期风控告警 | FR-005/007、US-009/010 |
| `/admin/stats` | admin | 时间筛选、趋势与分布图 | FR-005、US-009 |
| `/admin/audit-logs` | admin | 审计日志筛选、分页、详情摘要 | NFR-005/007 |

站点根路由跳转本站角色首页；未知路由显示 404。路由守卫处理未登录跳转，账号角色与站点不匹配时显示 403 并给出正确站点链接，但权限安全仍由后端保证。

## 3. 工程结构

```text
src/frontend/
├─ sites/                       # 四个站点入口，每个含 index.html（角色化 title/description）与 main.tsx（本站路由表）
│  ├─ customer/ operator/ verifier/ admin/
├─ vite.site.ts                 # 站点配置工厂：root、端口、产物目录
├─ vite.<site>.config.ts         # 四份构建配置
├─ vite.config.ts               # 仅供 vitest 与编辑器工具链使用
└─ src/
   ├─ app/                      # SiteApp 骨架（登录 + 布局 + 路由）、site-config（角色化文案与跨站 URL）、demo store
   ├─ pages/                    # customer/operator/verifier/admin，各站点只导入自己的目录
   ├─ components/               # 共享组件：状态组件、Metric、CouponCard、跨站入口 SiteLinks
   ├─ stores/                   # auth 与 UI 偏好；不复制服务端业务数据
   ├─ services/                 # Axios 客户端、token 刷新协调
   ├─ styles/                   # Tailwind、主题和动画；站点主色通过 CSS 变量注入
   └─ types/                    # 前端局部类型；公共契约从 src/shared 导入
```

站点差异（名称、定位、hero 文案、登录提示、可用账号、主题色、导航、跨站链接文案）集中在 `src/app/site-config.tsx`，页面文案按角色在各自 `pages/<role>` 内表述，避免四套重复骨架。

TanStack Query 管理服务端数据、缓存和失效；Zustand 仅管理当前用户/access token、主题和布局状态。

## 4. 认证与 token 生命周期

- 登录成功后 access token 保存在内存 Zustand，不写 `localStorage`；refresh token 由 HttpOnly Cookie 管理，前端不可读取。
- 首次加载调用 `/auth/refresh` 恢复会话，再调用 `/auth/me`。
- API 遇到一次 401 时，由单一刷新队列调用 refresh，成功后重放原请求；刷新失败则清理状态并回登录页，避免并发刷新风暴。
- 登出调用后端撤销 refresh token，并清理 Query 缓存和内存状态。
- 登录表单只含用户名、密码，不让用户自行选择角色；角色以服务端返回为准。
- 注册表单含账号、显示名称（可选）、密码、确认密码，以及非 customer 站点的可选员工注册码；角色由站点固定并以只读文案展示，前端不提供角色下拉。客户端校验与后端同一套规则（`usernamePattern`、`checkPassword` 来自 `src/shared`），最终判定仍由服务端做。
- 管理员站点登录页显示“管理员账号不开放注册”的说明而非注册链接。

## 5. 页面与交互状态

### 5.1 全局状态规范

每个数据页面都必须有：骨架/加载、成功、空、错误和重试状态；每个写操作必须防重复提交并显示成功/失败 Toast。错误消息使用后端业务码映射，不展示堆栈或敏感详情。

### 5.2 customer

- 首页上方显示“为你推荐”，每张推荐显示理由和 `AI推荐/热门推荐` 来源标签；没有可用活动时展示空状态。
- 活动列表展示名称、面额、有效期、剩余库存和限领数。
- 点击领券后按钮 loading；成功执行轻量券卡飞入动画并刷新活动/券包；库存不足、已领取、超限分别提示。
- 风控 `202 review` 显示“等待人工审核”，不显示成功领券；block 显示频繁操作提示。
- 券包支持全部/可使用/已使用/已过期四种筛选，按领取时间倒序。

### 5.3 operator

- 活动列表支持分页、状态筛选、创建、编辑、发布、暂停、恢复和软删除；不提供批量按钮。
- 表单字段与 API 一致，客户端校验库存、限领和时间，服务端错误回填到字段或全局提示。
- 风控审核页默认显示 pending，展示用户、活动、评分、来源、原因、时间；放行/拒绝必须二次确认并填写理由，完成后刷新列表。

### 5.4 verifier

- 核销页始终提供券码和业务单号输入；浏览器支持摄像头时可提供在线扫码填充券码，不承诺专用硬件，也不缓存离线核销。
- 成功显示绿色结果卡；幂等重放明确显示“已处理，返回首次结果”；过期、无效、已核销显示对应原因。
- 历史页按活动、时间、用户筛选并分页。

### 5.5 admin

- 统计页包含活动数、领取数、核销数、领取率、核销率、剩余库存，配合时间范围筛选、趋势折线图和活动状态分布。
- 无数据时指标为 0、图表为空态，不生成示例数值。
- 首页显示近期风控告警只读列表。
- 审计日志页支持操作人、动作、资源、结果、时间筛选；详情不展示已脱敏原值或 token。

## 6. 导航、跨站入口与权限可见性

| 站点/角色 | 站内导航 |
|---|---|
| customer（主站） | 发现优惠、我的券包 |
| operator | 运营概览、活动管理、风控审核 |
| verifier | 快速核销、核销记录 |
| admin | 数据总览、数据分析、审计日志 |

跨站入口规则：

- 主站首页提供三张站点卡片超链（含角色定位、职责描述与可用演示账号），登录页提供同样的紧凑超链，登录前也能找到其他站点。
- 三个后台站点在侧栏提供“返回优惠券中心”超链，顶栏提供切换到其余站点的下拉超链。
- 跨站地址来自 `VITE_SITE_CUSTOMER_URL` / `VITE_SITE_OPERATOR_URL` / `VITE_SITE_VERIFIER_URL` / `VITE_SITE_ADMIN_URL`，未配置时回退到本地开发端口。
- 站点之间不共享登录态（不同 origin），在错误站点登录时给出“该账号属于 X 角色，请前往 Y 站点”的提示与跳转。

前端不得根据客户端传入角色伪造菜单；菜单来自认证用户角色的本地映射。直接访问无权路由显示 403 并记录客户端错误上下文，后端仍返回 403。

## 7. 响应式、主题与可访问性

- `<768px` 单列卡片和抽屉/底部导航；`768~1024px` 双列且侧栏可折叠；`>1024px` 三列和完整侧栏。
- 支持亮/暗主题，主题偏好可存本地，但认证信息不可持久化。
- 领券动画优先使用 transform/opacity，目标 60fps；尊重 `prefers-reduced-motion` 并提供无动画反馈。
- 表单有可见标签，按钮有可访问名称，键盘可完成核心流程；状态不只依赖颜色。
- Ant Design 主题与 Tailwind token 统一主色、间距、圆角和响应式断点，避免两套样式相互覆盖。

## 8. 数据查询与缓存失效

| 操作 | 失效/刷新 |
|---|---|
| 登录/登出 | 清空全部角色数据缓存 |
| 活动创建/编辑/状态变化 | `campaigns`、对应详情、相关 stats |
| 领券成功 | `campaigns`、`my-coupons`、`recommendations` |
| 风控审核 | `risk-records`；放行后不替用户自动领券 |
| 核销成功 | `verifications`、相关 stats；customer 下次访问刷新券包 |

禁止无限重试写操作；普通查询最多有限重试。AI 推荐失败由后端降级，前端不自行拼接伪 AI 理由。

## 9. 前端验证范围

- 组件/页面测试：加载、空、错误、成功、权限菜单、表单校验、来源标签、刷新失败退出。
- E2E：四角色登录与导航、活动管理、领券与券包、核销与幂等结果、风控审核、统计和审计日志。
- 响应式与动画需在真实浏览器验证；当前尚未实现或执行，不声明页面加载时间或 60fps 已达标。
