import { App as AntApp, Button, Card, Input, Modal, Progress, Space, Table, Tag, Typography } from 'antd';
import { useDemo } from '@/app/demo-context';
import { PageHeader } from '@/components/common/Page';
import type { DemoRisk } from '@/demo';

const { Text } = Typography;

/** 风控人工审核：运营对 AI/规则拦截的领券请求放行或拒绝 */
export default function RiskReview() {
  const { risks, reviewRisk } = useDemo();
  const { message } = AntApp.useApp();

  const act = (risk: DemoRisk, approved: boolean) => Modal.confirm({
    title: approved ? '确认放行此请求？' : '确认拒绝此请求？',
    content: <Input.TextArea placeholder="请输入审核理由（必填，会写入审计日志）" />,
    okButtonProps: { danger: !approved },
    onOk: () => {
      reviewRisk(risk.id, approved);
      message.success(approved ? '已放行，用户可在 30 分钟内重新领券' : '已拒绝该领券请求');
    }
  });

  const columns = [
    { title: '用户/活动', render: (_: unknown, row: DemoRisk) => <Space direction="vertical" size={0}><Text strong>{row.username}</Text><Text type="secondary">{row.campaignName}</Text></Space> },
    { title: '风险分', dataIndex: 'riskScore', render: (value: number) => <Progress type="circle" size={46} percent={value} strokeColor={value > 70 ? '#ef4444' : '#f59e0b'} /> },
    { title: '来源', dataIndex: 'source', render: (value: string) => <Tag color={value === 'ai' ? 'purple' : 'blue'}>{value === 'ai' ? 'AI 检测' : '规则引擎'}</Tag> },
    { title: '原因', dataIndex: 'reasons', render: (values: string[]) => values.map((item) => <Tag key={item}>{item}</Tag>) },
    { title: '状态', dataIndex: 'reviewStatus', render: (value: string) => <Tag color={value === 'pending' ? 'orange' : value === 'approved' ? 'green' : 'red'}>{value === 'pending' ? '待审核' : value === 'approved' ? '已放行' : '已拒绝'}</Tag> },
    {
      title: '操作', render: (_: unknown, row: DemoRisk) => row.reviewStatus === 'pending'
        ? <Space><Button type="primary" onClick={() => act(row, true)}>放行</Button><Button danger onClick={() => act(row, false)}>拒绝</Button></Space>
        : '-'
    }
  ];

  return <>
    <PageHeader title="风控审核" subtitle="AI 与规则引擎协同识别异常领券，放行与拒绝都会留下审计记录" extra={<Tag color="green">规则引擎运行正常</Tag>} />
    <Card className="panel"><Table rowKey="id" dataSource={risks} columns={columns} scroll={{ x: 900 }} /></Card>
  </>;
}
