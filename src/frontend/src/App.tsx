import { createContext, useContext, useState, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  App as AntApp, Avatar, Badge, Button, Card, Col, ConfigProvider, DatePicker, Descriptions, Drawer,
  Dropdown, Flex, Form, Input, InputNumber, Layout, List, Menu, Modal, Progress, Result, Row,
  Segmented, Select, Space, Statistic, Table, Tag, theme, Timeline, Tooltip, Typography
} from 'antd';
import {
  AppstoreOutlined, AuditOutlined, BarChartOutlined, BulbOutlined, CheckCircleOutlined, GiftOutlined,
  HomeOutlined, LogoutOutlined, MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined, MoonOutlined,
  PlusOutlined, SafetyCertificateOutlined, ScanOutlined, SettingOutlined, SunOutlined, ThunderboltOutlined,
  UnorderedListOutlined, UserOutlined
} from '@ant-design/icons';
import type { CampaignDto, CouponDto, Role, UserSummary } from '@coupon/shared';
import { demoUsers, initialCampaigns, initialCoupons, initialRisks, initialVerifications, roleLabel, statusLabel, type DemoVerification } from './demo';
import { EmptyState, NotFoundPage } from './components/common/AsyncState';
import { Money, PageHeader } from './components/common/Page';
import './styles/index.css';

const { Header, Sider, Content } = Layout;
const { Text, Title, Paragraph } = Typography;

type Risk = (typeof initialRisks)[number];
interface DemoState {
  user: UserSummary | null;
  campaigns: CampaignDto[];
  coupons: CouponDto[];
  risks: Risk[];
  verifications: DemoVerification[];
  login: (username: string, password: string) => boolean;
  logout: () => void;
  claim: (campaign: CampaignDto) => CouponDto | null;
  addCampaign: (values: Record<string, unknown>) => void;
  updateCampaignStatus: (id: string, status: CampaignDto['status']) => void;
  reviewRisk: (id: string, approved: boolean) => void;
  verify: (code: string, order: string) => { ok: boolean; replay?: boolean; message: string };
}
const DemoContext = createContext<DemoState | null>(null);
const useDemo = () => { const value = useContext(DemoContext); if (!value) throw new Error('Demo context missing'); return value; };

function DemoProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [coupons, setCoupons] = useState(initialCoupons);
  const [risks, setRisks] = useState(initialRisks);
  const [verifications, setVerifications] = useState(initialVerifications);
  const login = (username: string, password: string) => {
    const account = demoUsers[username];
    if (!account || password !== 'Coupon123!') return false;
    setUser(account); return true;
  };
  const claim = (campaign: CampaignDto) => {
    if (coupons.some((coupon) => coupon.campaignId === campaign.id && coupon.status === 'claimed')) return null;
    const coupon: CouponDto = { id: crypto.randomUUID(), campaignId: campaign.id, code: `CP-${Date.now().toString().slice(-10)}`, status: 'claimed', campaignName: campaign.name, value: campaign.value, claimedAt: new Date().toISOString(), expiresAt: campaign.endTime };
    setCoupons((items) => [coupon, ...items]);
    setCampaigns((items) => items.map((item) => item.id === campaign.id ? { ...item, remainingStock: Math.max(0, item.remainingStock - 1) } : item));
    return coupon;
  };
  const addCampaign = (values: Record<string, unknown>) => setCampaigns((items) => [{
    id: crypto.randomUUID(), name: String(values.name), description: String(values.description ?? ''), couponType: String(values.couponType ?? 'fixed'),
    value: Number(values.value), totalStock: Number(values.totalStock), remainingStock: Number(values.totalStock), perUserLimit: Number(values.perUserLimit),
    startTime: new Date(String(values.startTime)).toISOString(), endTime: new Date(String(values.endTime)).toISOString(), status: 'draft'
  }, ...items]);
  const updateCampaignStatus = (id: string, status: CampaignDto['status']) => setCampaigns((items) => items.map((item) => item.id === id ? { ...item, status } : item));
  const reviewRisk = (id: string, approved: boolean) => setRisks((items) => items.map((item) => item.id === id ? { ...item, reviewStatus: approved ? 'approved' : 'rejected' } : item) as Risk[]);
  const verify = (code: string, order: string) => {
    const replay = verifications.find((item) => item.couponCode === code && item.bizOrderNo === order);
    if (replay) return { ok: true, replay: true, message: '该请求已处理，已返回首次核销结果' };
    const coupon = coupons.find((item) => item.code === code);
    if (!coupon) return { ok: false, message: '券码不存在，请检查后重试' };
    if (coupon.status === 'expired') return { ok: false, message: '优惠券已过期，无法核销' };
    if (coupon.status === 'verified') return { ok: false, message: '优惠券已经核销' };
    const record: DemoVerification = { id: crypto.randomUUID(), couponCode: code, campaignName: coupon.campaignName, username: 'customer_a', bizOrderNo: order, result: 'success', createdAt: new Date().toISOString() };
    setVerifications((items) => [record, ...items]);
    setCoupons((items) => items.map((item) => item.code === code ? { ...item, status: 'verified', verifiedAt: record.createdAt } : item));
    return { ok: true, message: '核销成功' };
  };
  return <DemoContext.Provider value={{ user, campaigns, coupons, risks, verifications, login, logout: () => setUser(null), claim, addCampaign, updateCampaignStatus, reviewRisk, verify }}>{children}</DemoContext.Provider>;
}

const roleHome: Record<Role, string> = { customer: '/customer', operator: '/operator', verifier: '/verifier', admin: '/admin' };
const navByRole: Record<Role, Array<{ key: string; label: string; icon: ReactNode }>> = {
  customer: [{ key: '/customer', label: '发现优惠', icon: <HomeOutlined /> }, { key: '/customer/my-coupons', label: '我的券包', icon: <GiftOutlined /> }],
  operator: [{ key: '/operator', label: '运营概览', icon: <HomeOutlined /> }, { key: '/operator/campaigns', label: '活动管理', icon: <AppstoreOutlined /> }, { key: '/operator/risk-review', label: '风控审核', icon: <SafetyCertificateOutlined /> }],
  verifier: [{ key: '/verifier', label: '快速核销', icon: <ScanOutlined /> }, { key: '/verifier/history', label: '核销记录', icon: <UnorderedListOutlined /> }],
  admin: [{ key: '/admin', label: '数据总览', icon: <HomeOutlined /> }, { key: '/admin/stats', label: '数据分析', icon: <BarChartOutlined /> }, { key: '/admin/audit-logs', label: '审计日志', icon: <AuditOutlined /> }]
};

function LoginPage() {
  const { user, login } = useDemo(); const navigate = useNavigate(); const { message } = AntApp.useApp();
  if (user) return <Navigate to={roleHome[user.role]} replace />;
  const submit = (values: { username: string; password: string }) => {
    if (!login(values.username, values.password)) return message.error('用户名或密码错误');
    const account = demoUsers[values.username]; if (account) navigate(roleHome[account.role]);
  };
  return <div className="login-screen">
    <div className="login-art">
      <div className="brand-mark"><GiftOutlined /></div><Tag color="blue">AI POWERED COUPON OS</Tag>
      <Title className="hero-title">让每一张优惠券<br /><span>精准触达，高效核销</span></Title>
      <Paragraph className="hero-copy">覆盖活动创建、智能推荐、原子领券、风险审核与幂等核销的全生命周期运营平台。</Paragraph>
      <div className="hero-metrics"><div><b>99.99%</b><span>库存一致性</span></div><div><b>&lt;200ms</b><span>核销响应目标</span></div><div><b>AI + Rules</b><span>双重风控</span></div></div>
    </div>
    <Card className="login-card" bordered={false}>
      <Space direction="vertical" size={4}><Text type="secondary">欢迎回来</Text><Title level={2}>登录优惠券中心</Title><Text type="secondary">使用演示账号探索不同角色的工作台</Text></Space>
      <Form layout="vertical" size="large" onFinish={submit} initialValues={{ username: 'customer_a', password: 'Coupon123!' }} className="login-form">
        <Form.Item name="username" label="账号" rules={[{ required: true }]}><Input prefix={<UserOutlined />} placeholder="请输入账号" /></Form.Item>
        <Form.Item name="password" label="密码" rules={[{ required: true }]}><Input.Password placeholder="Coupon123!" /></Form.Item>
        <Button type="primary" htmlType="submit" block size="large">进入工作台</Button>
      </Form>
      <div className="demo-accounts"><Text type="secondary">快速体验</Text><div className="account-grid">{Object.values(demoUsers).slice(0, 4).map((account) => <Button key={account.username} onClick={() => submit({ username: account.username, password: 'Coupon123!' })}><Avatar size="small">{account.displayName[0]}</Avatar>{roleLabel[account.role]}</Button>)}</div><Text type="secondary" className="password-hint">所有演示账号密码：Coupon123!</Text></div>
    </Card>
  </div>;
}

function ProtectedLayout() {
  const { user, logout } = useDemo(); const navigate = useNavigate(); const location = useLocation();
  const [collapsed, setCollapsed] = useState(false); const [mobile, setMobile] = useState(false); const [dark, setDark] = useState(false);
  if (!user) return <Navigate to="/login" replace />;
  const menu = <Menu mode="inline" selectedKeys={[location.pathname]} items={navByRole[user.role]} onClick={({ key }) => { navigate(key); setMobile(false); }} />;
  const signOut = () => { logout(); navigate('/login'); };
  return <ConfigProvider theme={{ algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: '#5b6df9', borderRadius: 12 } }}>
    <Layout className={`app-layout ${dark ? 'theme-dark' : ''}`}>
      <Sider className="desktop-sider" width={246} collapsedWidth={80} collapsible collapsed={collapsed} trigger={null} theme="light">
        <div className="app-brand" onClick={() => navigate(roleHome[user.role])}><span className="brand-icon"><GiftOutlined /></span>{!collapsed && <strong>Coupon OS</strong>}</div>
        {menu}<div className="sider-bottom"><Button type="text" block icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)}>{collapsed ? '' : '收起导航'}</Button></div>
      </Sider>
      <Drawer placement="left" open={mobile} onClose={() => setMobile(false)} width={270} styles={{ body: { padding: 0 } }}><div className="app-brand"><span className="brand-icon"><GiftOutlined /></span><strong>Coupon OS</strong></div>{menu}</Drawer>
      <Layout>
        <Header className="topbar"><Button className="mobile-menu" type="text" icon={<MenuOutlined />} onClick={() => setMobile(true)} /><div className="topbar-spacer" /><Tag color="processing">演示模式</Tag><Tooltip title="切换明暗主题"><Button type="text" shape="circle" icon={dark ? <SunOutlined /> : <MoonOutlined />} onClick={() => setDark(!dark)} /></Tooltip><Dropdown menu={{ items: [{ key: 'settings', label: '个人设置', icon: <SettingOutlined /> }, { type: 'divider' }, { key: 'logout', label: '退出登录', icon: <LogoutOutlined />, danger: true }], onClick: ({ key }) => key === 'logout' && signOut() }}><Button type="text" className="user-button"><Avatar>{user.displayName[0]}</Avatar><span><b>{user.displayName}</b><small>{roleLabel[user.role]}</small></span></Button></Dropdown></Header>
        <Content className="app-content"><div className="page-shell"><RoutesForRole role={user.role} /></div></Content>
      </Layout>
    </Layout>
  </ConfigProvider>;
}

function RoutesForRole({ role }: { role: Role }) {
  return <Routes>
    <Route path="/" element={<Navigate to={roleHome[role]} replace />} />
    <Route path="/customer" element={role === 'customer' ? <CustomerHome /> : <Forbidden />} />
    <Route path="/customer/my-coupons" element={role === 'customer' ? <CouponWallet /> : <Forbidden />} />
    <Route path="/operator" element={role === 'operator' ? <OperatorHome /> : <Forbidden />} />
    <Route path="/operator/campaigns" element={role === 'operator' ? <CampaignManagement /> : <Forbidden />} />
    <Route path="/operator/risk-review" element={role === 'operator' ? <RiskReview /> : <Forbidden />} />
    <Route path="/verifier" element={role === 'verifier' ? <VerifyPage /> : <Forbidden />} />
    <Route path="/verifier/history" element={role === 'verifier' ? <VerificationHistory /> : <Forbidden />} />
    <Route path="/admin" element={role === 'admin' ? <AdminDashboard /> : <Forbidden />} />
    <Route path="/admin/stats" element={role === 'admin' ? <AdminDashboard detailed /> : <Forbidden />} />
    <Route path="/admin/audit-logs" element={role === 'admin' ? <AuditLogs /> : <Forbidden />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>;
}
function Forbidden() { return <Result status="403" title="无权访问" subTitle="当前账号没有该页面的访问权限" />; }

function CampaignCard({ campaign, onClaim }: { campaign: CampaignDto; onClaim?: () => void }) {
  const percentage = Math.round((campaign.remainingStock / campaign.totalStock) * 100);
  return <Card className="coupon-card panel" hoverable>
    <Flex justify="space-between" align="start"><Tag color={campaign.couponType === 'discount' ? 'purple' : 'blue'}>{campaign.couponType === 'discount' ? '折扣券' : '满减券'}</Tag><Text type="secondary">剩余 {campaign.remainingStock}</Text></Flex>
    <div className="coupon-value">{campaign.couponType === 'discount' ? <><b>{campaign.value}</b><span>折</span></> : <><span>¥</span><b>{campaign.value}</b></>}</div>
    <Title level={4}>{campaign.name}</Title><Paragraph type="secondary" ellipsis={{ rows: 2 }}>{campaign.description}</Paragraph>
    <Progress percent={percentage} showInfo={false} strokeColor={{ from: '#5b6df9', to: '#9c6df9' }} /><Flex justify="space-between"><Text type="secondary">每人限领 {campaign.perUserLimit} 张</Text>{onClaim && <Button type="primary" onClick={onClaim}>立即领取</Button>}</Flex>
  </Card>;
}

function CustomerHome() {
  const { campaigns, claim } = useDemo(); const { message } = AntApp.useApp(); const [flying, setFlying] = useState(false);
  const active = campaigns.filter((item) => item.status === 'active');
  const doClaim = (campaign: CampaignDto) => { const coupon = claim(campaign); if (!coupon) return message.warning('你已经领取过这张券了'); message.success(`领取成功，券码 ${coupon.code}`); setFlying(true); setTimeout(() => setFlying(false), 900); };
  return <><PageHeader title="今天，也有好券相伴" subtitle="AI 已根据你的偏好挑选了最值得领取的优惠" extra={<Tag icon={<ThunderboltOutlined />} color="purple">智能推荐已开启</Tag>} />
    <Card className="recommend-banner panel"><Row align="middle" gutter={[24, 16]}><Col flex="auto"><Tag color="purple">AI PICK</Tag><Title level={2}>新用户专享礼券</Title><Paragraph>结合你的近期浏览和消费偏好，这张无门槛礼券预计最适合你。</Paragraph><Button type="primary" size="large" onClick={() => active[1] && doClaim(active[1])}>一键领取 ¥20</Button></Col><Col><div className="ai-orb"><BulbOutlined /></div></Col></Row></Card>
    <Flex justify="space-between" align="center" className="section-title"><Title level={3}>热门活动</Title><Text type="secondary">实时库存，先到先得</Text></Flex>
    <div className="responsive-grid">{active.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} onClaim={() => doClaim(campaign)} />)}</div>
    <AnimatePresence>{flying && <motion.div className="claim-success" initial={{ opacity: 0, y: 80, scale: .7 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 160 }}><Card><Space><CheckCircleOutlined className="success-icon" /><div><b>优惠券已放入券包</b><br /><Text type="secondary">现在就可以使用</Text></div></Space></Card></motion.div>}</AnimatePresence>
  </>;
}

function CouponWallet() {
  const { coupons } = useDemo(); const [filter, setFilter] = useState('all');
  const shown = coupons.filter((coupon) => filter === 'all' || (filter === 'usable' && coupon.status === 'claimed') || (filter === 'used' && coupon.status === 'verified') || (filter === 'expired' && coupon.status === 'expired'));
  return <><PageHeader title="我的券包" subtitle="管理你领取的所有优惠券" extra={<Badge count={coupons.filter((item) => item.status === 'claimed').length} showZero><GiftOutlined className="header-icon" /></Badge>} />
    <Segmented value={filter} onChange={(value) => setFilter(String(value))} options={[{ value: 'all', label: '全部' }, { value: 'usable', label: '可使用' }, { value: 'used', label: '已使用' }, { value: 'expired', label: '已过期' }]} className="filter-bar" />
    {shown.length ? <div className="responsive-grid">{shown.map((coupon) => <Card key={coupon.id} className={`wallet-card ${coupon.status !== 'claimed' ? 'coupon-muted' : ''}`}><Flex justify="space-between"><Tag color={coupon.status === 'claimed' ? 'green' : 'default'}>{statusLabel[coupon.status]}</Tag><Text copyable={{ text: coupon.code }}>{coupon.code}</Text></Flex><div className="wallet-value"><Money value={coupon.value} /></div><Title level={4}>{coupon.campaignName}</Title><Text type="secondary">有效期至 {new Date(coupon.expiresAt).toLocaleDateString()}</Text><div className="coupon-dash" /><Button type={coupon.status === 'claimed' ? 'primary' : 'default'} block disabled={coupon.status !== 'claimed'}>{coupon.status === 'claimed' ? '去使用' : statusLabel[coupon.status]}</Button></Card>)}</div> : <EmptyState title="这里还没有优惠券" description="去首页发现更多优惠活动吧" />}
  </>;
}

function OperatorHome() {
  const { campaigns, risks } = useDemo(); const navigate = useNavigate();
  const issued = campaigns.reduce((sum, item) => sum + item.totalStock - item.remainingStock, 0);
  return <><PageHeader title="运营工作台" subtitle="上午好，今天的活动运行稳定" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/operator/campaigns')}>创建活动</Button>} />
    <Row gutter={[16,16]}><Col xs={24} sm={12} xl={6}><Metric title="活动总数" value={campaigns.length} icon={<AppstoreOutlined />} color="#5b6df9" /></Col><Col xs={24} sm={12} xl={6}><Metric title="累计发券" value={issued} icon={<GiftOutlined />} color="#18a058" /></Col><Col xs={24} sm={12} xl={6}><Metric title="平均领取率" value={34.8} suffix="%" icon={<BarChartOutlined />} color="#f59e0b" /></Col><Col xs={24} sm={12} xl={6}><Metric title="待审核风险" value={risks.filter((r) => r.reviewStatus === 'pending').length} icon={<SafetyCertificateOutlined />} color="#ef4444" /></Col></Row>
    <div className="two-grid dashboard-grid"><Card title="活动库存概览" className="panel"><Space direction="vertical" size="large" className="full-width">{campaigns.slice(0,4).map((item) => <div key={item.id}><Flex justify="space-between"><Text>{item.name}</Text><Text type="secondary">{item.remainingStock}/{item.totalStock}</Text></Flex><Progress percent={Math.round((item.remainingStock/item.totalStock)*100)} showInfo={false} /></div>)}</Space></Card><Card title="最近动态" className="panel"><Timeline items={[{ color:'green', children:'新用户专享礼券刚刚被领取' },{ color:'blue', children:'夏日清凉满减券库存更新' },{ color:'red', children:'检测到一条高风险领券请求' },{ color:'gray', children:'系统规则库已完成同步' }]} /></Card></div>
  </>;
}
function Metric({ title, value, suffix, icon, color }: { title: string; value: number; suffix?: string; icon: ReactNode; color: string }) { return <Card className="metric-card panel"><Flex justify="space-between" align="center"><Statistic title={title} value={value} suffix={suffix} /><span className="metric-icon" style={{ color, background: `${color}18` }}>{icon}</span></Flex></Card>; }

function CampaignManagement() {
  const { campaigns, addCampaign, updateCampaignStatus } = useDemo(); const { message } = AntApp.useApp(); const [open, setOpen] = useState(false); const [form] = Form.useForm();
  const save = async () => { const values = await form.validateFields(); addCampaign(values); setOpen(false); form.resetFields(); message.success('活动草稿创建成功'); };
  const columns = [
    { title: '活动', dataIndex: 'name', render: (_: unknown, row: CampaignDto) => <Space direction="vertical" size={0}><Text strong>{row.name}</Text><Text type="secondary">{row.couponType === 'discount' ? `${row.value} 折` : `¥${row.value}`}</Text></Space> },
    { title: '状态', dataIndex: 'status', render: (value: string) => <Tag color={value === 'active' ? 'green' : value === 'draft' ? 'blue' : 'default'}>{statusLabel[value]}</Tag> },
    { title: '库存', render: (_: unknown, row: CampaignDto) => <Text>{row.remainingStock} / {row.totalStock}</Text> },
    { title: '有效期', render: (_: unknown, row: CampaignDto) => `${new Date(row.startTime).toLocaleDateString()} - ${new Date(row.endTime).toLocaleDateString()}` },
    { title: '操作', render: (_: unknown, row: CampaignDto) => <Space><Button type="link" onClick={() => updateCampaignStatus(row.id, row.status === 'active' ? 'paused' : 'active')}>{row.status === 'active' ? '暂停' : '发布'}</Button><Button type="link" danger onClick={() => updateCampaignStatus(row.id, 'deleted')}>删除</Button></Space> }
  ];
  return <><PageHeader title="活动管理" subtitle="创建和维护优惠券活动，实时掌握库存" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>创建活动</Button>} /><Card className="panel"><Table rowKey="id" dataSource={campaigns.filter((item) => item.status !== 'deleted')} columns={columns} pagination={{ pageSize: 6 }} scroll={{ x: 760 }} /></Card>
    <Modal title="创建优惠券活动" open={open} onCancel={() => setOpen(false)} onOk={() => void save()} okText="创建草稿" width={680}><Form form={form} layout="vertical" initialValues={{ couponType: 'fixed', perUserLimit: 1, totalStock: 100 }}><Form.Item name="name" label="活动名称" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="description" label="活动说明"><Input.TextArea /></Form.Item><Row gutter={16}><Col span={12}><Form.Item name="couponType" label="券类型"><Select options={[{value:'fixed',label:'满减券'},{value:'discount',label:'折扣券'}]} /></Form.Item></Col><Col span={12}><Form.Item name="value" label="面额/折扣" rules={[{required:true}]}><InputNumber min={0.1} className="full-width" /></Form.Item></Col><Col span={12}><Form.Item name="totalStock" label="总库存"><InputNumber min={1} max={100000} className="full-width" /></Form.Item></Col><Col span={12}><Form.Item name="perUserLimit" label="每人限领"><InputNumber min={1} className="full-width" /></Form.Item></Col><Col span={12}><Form.Item name="startTime" label="开始时间" rules={[{required:true}]}><Input type="datetime-local" /></Form.Item></Col><Col span={12}><Form.Item name="endTime" label="结束时间" rules={[{required:true}]}><Input type="datetime-local" /></Form.Item></Col></Row></Form></Modal>
  </>;
}

function RiskReview() {
  const { risks, reviewRisk } = useDemo(); const { message } = AntApp.useApp();
  const act = (risk: Risk, approved: boolean) => Modal.confirm({ title: approved ? '确认放行此请求？' : '确认拒绝此请求？', content: <Input.TextArea placeholder="请输入审核理由" />, okButtonProps: { danger: !approved }, onOk: () => { reviewRisk(risk.id, approved); message.success(approved ? '已放行，用户可重新领券' : '已拒绝该领券请求'); } });
  const columns = [
    { title: '用户/活动', render: (_:unknown,row:Risk) => <Space direction="vertical" size={0}><Text strong>{row.username}</Text><Text type="secondary">{row.campaignName}</Text></Space> },
    { title: '风险分', dataIndex: 'riskScore', render: (value:number) => <Progress type="circle" size={46} percent={value} strokeColor={value > 70 ? '#ef4444':'#f59e0b'} /> },
    { title: '来源', dataIndex: 'source', render:(v:string)=><Tag color={v==='ai'?'purple':'blue'}>{v==='ai'?'AI 检测':'规则引擎'}</Tag> },
    { title: '原因', dataIndex:'reasons', render:(values:string[]) => values.map((v)=><Tag key={v}>{v}</Tag>) },
    { title: '状态', dataIndex:'reviewStatus', render:(v:string)=><Tag color={v==='pending'?'orange':v==='approved'?'green':'red'}>{v==='pending'?'待审核':v==='approved'?'已放行':'已拒绝'}</Tag> },
    { title: '操作', render:(_:unknown,row:Risk) => row.reviewStatus === 'pending' ? <Space><Button type="primary" onClick={()=>act(row,true)}>放行</Button><Button danger onClick={()=>act(row,false)}>拒绝</Button></Space> : '-' }
  ];
  return <><PageHeader title="风控审核" subtitle="AI 与规则引擎协同识别异常领券行为" extra={<Tag color="green">规则引擎运行正常</Tag>} /><Card className="panel"><Table rowKey="id" dataSource={risks} columns={columns} scroll={{x:900}} /></Card></>;
}

function VerifyPage() {
  const { verify } = useDemo(); const [result, setResult] = useState<{ ok:boolean; replay?:boolean; message:string }>(); const [form] = Form.useForm();
  const submit = (values:{code:string;order:string}) => setResult(verify(values.code.trim(), values.order.trim()));
  return <div className="verify-wrap"><PageHeader title="快速核销" subtitle="输入券码和业务单号，系统将保证重复请求幂等" /><Card className="verify-card panel"><div className="scan-symbol"><ScanOutlined /></div><Title level={3}>核销优惠券</Title><Text type="secondary">演示可用券码：CP-DEMO-2026-001</Text><Form form={form} layout="vertical" size="large" onFinish={submit} initialValues={{ code:'CP-DEMO-2026-001', order:`ORDER-${Date.now().toString().slice(-6)}` }}><Form.Item name="code" label="优惠券码" rules={[{required:true}]}><Input prefix={<GiftOutlined />} /></Form.Item><Form.Item name="order" label="业务单号" rules={[{required:true}]}><Input /></Form.Item><Button type="primary" htmlType="submit" block size="large" icon={<ScanOutlined />}>确认核销</Button></Form>{result && <Result status={result.ok?'success':'error'} title={result.message} subTitle={result.replay?'幂等重放：业务结果与首次处理完全一致':result.ok?'核销记录已安全写入系统':'请核对券码或券状态'} />}</Card></div>;
}

function VerificationHistory() {
  const { verifications } = useDemo();
  return <><PageHeader title="核销记录" subtitle="查询和追溯所有核销操作" /><Card className="panel"><Table rowKey="id" dataSource={verifications} columns={[{title:'券码',dataIndex:'couponCode',render:(v:string)=><Text code>{v}</Text>},{title:'活动',dataIndex:'campaignName'},{title:'用户',dataIndex:'username'},{title:'业务单号',dataIndex:'bizOrderNo'},{title:'结果',dataIndex:'result',render:()=> <Tag color="green">成功</Tag>},{title:'时间',dataIndex:'createdAt',render:(v:string)=>new Date(v).toLocaleString()}]} scroll={{x:760}} /></Card></>;
}

function AdminDashboard({ detailed = false }: { detailed?: boolean }) {
  const { campaigns, coupons, verifications, risks } = useDemo(); const claimed = campaigns.reduce((sum,item)=>sum+item.totalStock-item.remainingStock,0); const rate = claimed ? Math.round(verifications.length/claimed*1000)/10 : 0;
  const trend = [12,18,15,28,34,42,38].map((value,index)=>({ day:`${index+24}日`, claims:value, verifies:Math.round(value*.42) }));
  return <><PageHeader title={detailed?'数据分析':'数据总览'} subtitle="关键业务指标实时汇总，帮助你快速做出决策" extra={<DatePicker.RangePicker />} />
    <Row gutter={[16,16]}><Col xs={24} sm={12} xl={6}><Metric title="累计活动" value={campaigns.length} icon={<AppstoreOutlined />} color="#5b6df9" /></Col><Col xs={24} sm={12} xl={6}><Metric title="累计发券" value={claimed} icon={<GiftOutlined />} color="#18a058" /></Col><Col xs={24} sm={12} xl={6}><Metric title="核销数量" value={verifications.length} icon={<CheckCircleOutlined />} color="#f59e0b" /></Col><Col xs={24} sm={12} xl={6}><Metric title="核销率" value={rate} suffix="%" icon={<BarChartOutlined />} color="#9c6df9" /></Col></Row>
    <div className="two-grid dashboard-grid"><Card title="近 7 日领取趋势" className="panel"><div className="simple-chart">{trend.map((item)=><Tooltip key={item.day} title={`${item.day} 领取 ${item.claims}`}><div><span style={{height:`${item.claims*3}px`}} /><small>{item.day}</small></div></Tooltip>)}</div></Card><Card title="活动状态分布" className="panel"><Flex justify="space-around" align="center" className="donut-wrap"><Progress type="dashboard" percent={Math.round(campaigns.filter(c=>c.status==='active').length/campaigns.length*100)} strokeColor="#5b6df9" format={(p)=>`${p}% 进行中`} /><Space direction="vertical">{['active','draft','paused'].map((status)=><Badge key={status} color={status==='active'?'#5b6df9':status==='draft'?'#18a058':'#f59e0b'} text={`${statusLabel[status]} ${campaigns.filter(c=>c.status===status).length}`} />)}</Space></Flex></Card></div>
    <Card title="近期风险告警" className="panel"><List dataSource={risks} renderItem={(item)=><List.Item extra={<Tag color={item.riskScore>70?'red':'orange'}>风险分 {item.riskScore}</Tag>}><List.Item.Meta avatar={<Avatar icon={<SafetyCertificateOutlined />} />} title={`${item.username} · ${item.campaignName}`} description={`${item.reasons.join('；')} · ${new Date(item.createdAt).toLocaleString()}`} /></List.Item>} /></Card>
    {detailed && <Card title="券包状态补充数据" className="panel section-card"><Descriptions column={{xs:1,sm:3}} items={[{key:'1',label:'当前可用券',children:coupons.filter(c=>c.status==='claimed').length},{key:'2',label:'已使用券',children:coupons.filter(c=>c.status==='verified').length},{key:'3',label:'过期券',children:coupons.filter(c=>c.status==='expired').length}]} /></Card>}
  </>;
}

function AuditLogs() {
  const logs = [
    { id:'a1', action:'auth.login', actor:'admin', resource:'session', outcome:'success', time:new Date().toISOString() },
    { id:'a2', action:'campaign.update', actor:'operator', resource:'夏日清凉满减券', outcome:'success', time:new Date(Date.now()-3600000).toISOString() },
    { id:'a3', action:'risk.review', actor:'operator', resource:'risk:r1', outcome:'success', time:new Date(Date.now()-7200000).toISOString() },
    { id:'a4', action:'auth.denied', actor:'customer_c', resource:'/admin/audit-logs', outcome:'denied', time:new Date(Date.now()-9000000).toISOString() }
  ];
  return <><PageHeader title="审计日志" subtitle="追踪关键操作，敏感信息已自动脱敏" extra={<Button icon={<AuditOutlined />}>导出当前视图</Button>} /><Card className="panel"><Flex gap={12} wrap className="table-filters"><Input.Search placeholder="搜索动作或资源" style={{maxWidth:280}} /><Select defaultValue="all" options={[{value:'all',label:'全部结果'},{value:'success',label:'成功'},{value:'denied',label:'拒绝'}]} /></Flex><Table rowKey="id" dataSource={logs} columns={[{title:'操作时间',dataIndex:'time',render:(v:string)=>new Date(v).toLocaleString()},{title:'操作者',dataIndex:'actor'},{title:'动作',dataIndex:'action',render:(v:string)=><Text code>{v}</Text>},{title:'资源',dataIndex:'resource'},{title:'结果',dataIndex:'outcome',render:(v:string)=><Tag color={v==='success'?'green':'red'}>{v==='success'?'成功':'拒绝'}</Tag>},{title:'详情',render:()=> <Button type="link">查看</Button>}]} /></Card></>;
}

export default function App() {
  return <BrowserRouter><DemoProvider><AntApp><Routes><Route path="/login" element={<LoginPage />} /><Route path="*" element={<ProtectedLayout />} /></Routes></AntApp></DemoProvider></BrowserRouter>;
}
