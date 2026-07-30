import { Card, Table, Tag, Typography } from 'antd';
import { useDemo } from '@/app/demo-context';
import { PageHeader } from '@/components/common/Page';

const { Text } = Typography;

/** 核销记录：按券码/活动/业务单号追溯本站的核销操作 */
export default function VerificationHistory() {
  const { verifications } = useDemo();
  return <>
    <PageHeader title="核销记录" subtitle="按券码与业务单号追溯每一次核销操作" />
    <Card className="panel">
      <Table rowKey="id" dataSource={verifications} scroll={{ x: 760 }} columns={[
        { title: '券码', dataIndex: 'couponCode', render: (value: string) => <Text code>{value}</Text> },
        { title: '活动', dataIndex: 'campaignName' },
        { title: '持券用户', dataIndex: 'username' },
        { title: '业务单号', dataIndex: 'bizOrderNo' },
        { title: '结果', dataIndex: 'result', render: () => <Tag color="green">成功</Tag> },
        { title: '核销时间', dataIndex: 'createdAt', render: (value: string) => new Date(value).toLocaleString() }
      ]} />
    </Card>
  </>;
}
