import { useState } from 'react';
import { Button, Card, Form, Input, Result, Typography } from 'antd';
import { GiftOutlined, ScanOutlined } from '@ant-design/icons';
import { useDemo, type VerifyOutcome } from '@/app/demo-context';
import { PageHeader } from '@/components/common/Page';

const { Text, Title } = Typography;

/** 核销终端首页：券码 + 业务单号，业务单号保证幂等 */
export default function VerifyPage() {
  const { verify } = useDemo();
  const [result, setResult] = useState<VerifyOutcome>();
  const [form] = Form.useForm();

  return <div className="verify-wrap">
    <PageHeader title="快速核销" subtitle="输入券码和业务单号，同一业务单号重复提交只会核销一次" />
    <Card className="verify-card panel">
      <div className="scan-symbol"><ScanOutlined /></div>
      <Title level={3}>核销优惠券</Title>
      <Text type="secondary">演示可用券码：CP-DEMO-2026-001</Text>
      <Form
        form={form} layout="vertical" size="large"
        onFinish={(values: { code: string; order: string }) => setResult(verify(values.code.trim(), values.order.trim()))}
        initialValues={{ code: 'CP-DEMO-2026-001', order: `ORDER-${Date.now().toString().slice(-6)}` }}
      >
        <Form.Item name="code" label="优惠券码" rules={[{ required: true }]}><Input prefix={<GiftOutlined />} /></Form.Item>
        <Form.Item name="order" label="业务单号" rules={[{ required: true }]}><Input /></Form.Item>
        <Button type="primary" htmlType="submit" block size="large" icon={<ScanOutlined />}>确认核销</Button>
      </Form>
      {result && <Result
        status={result.ok ? 'success' : 'error'}
        title={result.message}
        subTitle={result.replay ? '幂等重放：业务结果与首次处理完全一致' : result.ok ? '核销记录已安全写入系统' : '请核对券码或券状态'}
      />}
    </Card>
  </div>;
}
