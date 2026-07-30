import { Button, Card, Flex, Input, Select, Table, Tag, Typography } from 'antd';
import { AuditOutlined } from '@ant-design/icons';
import { PageHeader } from '@/components/common/Page';

const { Text } = Typography;

/** 审计日志：管理员查看关键操作留痕，详情不展示原始敏感值 */
export default function AuditLogs() {
  const logs = [
    { id: 'a1', action: 'auth.login', actor: 'admin', resource: 'session', outcome: 'success', time: new Date().toISOString() },
    { id: 'a2', action: 'campaign.update', actor: 'operator', resource: '夏日清凉满减券', outcome: 'success', time: new Date(Date.now() - 3600000).toISOString() },
    { id: 'a3', action: 'risk.review', actor: 'operator', resource: 'risk:r1', outcome: 'success', time: new Date(Date.now() - 7200000).toISOString() },
    { id: 'a4', action: 'auth.denied', actor: 'customer_c', resource: '/admin/audit-logs', outcome: 'denied', time: new Date(Date.now() - 9000000).toISOString() }
  ];

  return <>
    <PageHeader title="审计日志" subtitle="追踪登录、活动变更与风控审核等关键操作，敏感信息已自动脱敏" extra={<Button icon={<AuditOutlined />}>导出当前视图</Button>} />
    <Card className="panel">
      <Flex gap={12} wrap className="table-filters">
        <Input.Search placeholder="搜索动作或资源" style={{ maxWidth: 280 }} />
        <Select defaultValue="all" options={[{ value: 'all', label: '全部结果' }, { value: 'success', label: '成功' }, { value: 'denied', label: '拒绝' }]} />
      </Flex>
      <Table rowKey="id" dataSource={logs} columns={[
        { title: '操作时间', dataIndex: 'time', render: (value: string) => new Date(value).toLocaleString() },
        { title: '操作者', dataIndex: 'actor' },
        { title: '动作', dataIndex: 'action', render: (value: string) => <Text code>{value}</Text> },
        { title: '资源', dataIndex: 'resource' },
        { title: '结果', dataIndex: 'outcome', render: (value: string) => <Tag color={value === 'success' ? 'green' : 'red'}>{value === 'success' ? '成功' : '拒绝'}</Tag> },
        { title: '详情', render: () => <Button type="link">查看</Button> }
      ]} />
    </Card>
  </>;
}
