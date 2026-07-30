import { App as AntApp, Alert, Button, Card, Form, Input, Result, Space, Tag, Typography } from 'antd';
import { IdcardOutlined, LockOutlined, SafetyOutlined, UserAddOutlined, UserOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { checkPassword, passwordRules, usernamePattern } from '@coupon/shared';
import { useDemo } from '@/app/demo-context';
import { useSite } from '@/app/site-context';
import { roleLabel } from '@/demo';

const { Text, Title, Paragraph } = Typography;

interface RegisterForm { username: string; displayName?: string; password: string; confirm: string; staffCode?: string; }

/** 自助注册页：角色由站点固定，管理员站点不挂载此路由。 */
export default function RegisterPage() {
  const site = useSite();
  const { register } = useDemo();
  const navigate = useNavigate();
  const { message } = AntApp.useApp();

  if (!site.allowsSelfRegistration) {
    return <div className="login-screen">
      <Card className="login-card" bordered={false}>
        <Result
          status="warning"
          title={site.registerTitle}
          subTitle={site.registerHint}
          extra={<Button type="primary" onClick={() => navigate(`${site.home}/login`)}>返回登录</Button>}
        />
      </Card>
    </div>;
  }

  const submit = async (values: RegisterForm) => {
    const result = await register({
      username: values.username,
      password: values.password,
      displayName: values.displayName,
      role: site.role,
      staffCode: values.staffCode
    });
    if (!result.ok) return message.error(result.message);
    message.success(`注册成功，欢迎加入${site.brandName}`);
    navigate(site.home);
  };

  return <div className="login-screen">
    <div className="login-art">
      <div className="brand-mark">{site.icon}</div>
      <Tag color="blue">{site.audience}注册</Tag>
      <Title className="hero-title">{site.registerTitle}</Title>
      <Paragraph className="hero-copy">{site.registerHint}</Paragraph>
      <div className="hero-metrics">{site.heroMetrics.map((metric) => <div key={metric.label}><b>{metric.value}</b><span>{metric.label}</span></div>)}</div>
    </div>
    <Card className="login-card" bordered={false}>
      <Space direction="vertical" size={4}>
        <Text type="secondary">创建账号</Text>
        <Title level={2}>{site.registerTitle}</Title>
        <Text type="secondary">注册角色固定为 {roleLabel[site.role]}，由站点决定，不可自选</Text>
      </Space>
      <Alert className="register-notice" type="info" showIcon message={site.registerNotice} />
      <Form layout="vertical" size="large" onFinish={submit} className="login-form" requiredMark="optional">
        <Form.Item
          name="username" label="账号"
          rules={[{ required: true, message: '请输入账号' }, { pattern: usernamePattern, message: '账号需为 3-32 位字母、数字或下划线' }]}
        >
          <Input prefix={<UserOutlined />} placeholder="字母、数字或下划线，3-32 位" autoComplete="username" />
        </Form.Item>
        <Form.Item name="displayName" label="显示名称（可选）" rules={[{ max: 32, message: '显示名称最多 32 位' }]}>
          <Input prefix={<IdcardOutlined />} placeholder="留空则使用账号名" />
        </Form.Item>
        <Form.Item
          name="password" label="密码"
          rules={[
            { required: true, message: '请输入密码' },
            { validator: (_rule, value: string) => { const result = checkPassword(value ?? ''); return result.ok ? Promise.resolve() : Promise.reject(new Error(result.message)); } }
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder={`至少 ${passwordRules.minLength} 位，含字母和数字`} autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm" label="确认密码" dependencies={['password']}
          rules={[
            { required: true, message: '请再次输入密码' },
            ({ getFieldValue }) => ({ validator: (_rule, value: string) => value && value !== getFieldValue('password') ? Promise.reject(new Error('两次输入的密码不一致')) : Promise.resolve() })
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="再次输入密码" autoComplete="new-password" />
        </Form.Item>
        {site.role !== 'customer' && <Form.Item name="staffCode" label="员工注册码（可选）" extra="后端启用 REGISTRATION_STAFF_CODE 时必填；演示模式下不校验">
          <Input prefix={<SafetyOutlined />} placeholder="向管理员索取" />
        </Form.Item>}
        <Button type="primary" htmlType="submit" block size="large" icon={<UserAddOutlined />}>注册并进入{site.brandName}</Button>
      </Form>
      <div className="login-sites">
        <Text type="secondary">已有账号？<Link to={`${site.home}/login`}>直接登录</Link></Text>
      </div>
    </Card>
  </div>;
}
