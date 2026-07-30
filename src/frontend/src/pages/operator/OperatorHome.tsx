import { Button, Card, Col, Flex, Progress, Row, Space, Timeline, Typography } from 'antd';
import { AppstoreOutlined, BarChartOutlined, GiftOutlined, PlusOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '@/app/demo-context';
import { Metric } from '@/components/common/Metric';
import { PageHeader } from '@/components/common/Page';

const { Text, Title } = Typography;

/** 运营概览：活动与风控待办的入口页 */
export default function OperatorHome() {
  const { campaigns, risks } = useDemo();
  const navigate = useNavigate();
  const issued = campaigns.reduce((sum, item) => sum + item.totalStock - item.remainingStock, 0);
  const pending = risks.filter((item) => item.reviewStatus === 'pending').length;

  return <>
    <PageHeader
      title="运营工作台" subtitle="活动运行、库存消耗与风控待办的当日快照"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/operator/campaigns')}>创建活动</Button>}
    />
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} xl={6}><Metric title="活动总数" value={campaigns.length} icon={<AppstoreOutlined />} color="#0d9488" /></Col>
      <Col xs={24} sm={12} xl={6}><Metric title="累计发券" value={issued} icon={<GiftOutlined />} color="#18a058" /></Col>
      <Col xs={24} sm={12} xl={6}><Metric title="平均领取率" value={34.8} suffix="%" icon={<BarChartOutlined />} color="#f59e0b" /></Col>
      <Col xs={24} sm={12} xl={6}><Metric title="待审核风险" value={pending} icon={<SafetyCertificateOutlined />} color="#ef4444" /></Col>
    </Row>
    <div className="two-grid dashboard-grid">
      <Card title="活动库存概览" className="panel">
        <Space direction="vertical" size="large" className="full-width">{campaigns.slice(0, 4).map((item) => <div key={item.id}>
          <Flex justify="space-between"><Text>{item.name}</Text><Text type="secondary">{item.remainingStock}/{item.totalStock}</Text></Flex>
          <Progress percent={Math.round((item.remainingStock / item.totalStock) * 100)} showInfo={false} />
        </div>)}</Space>
      </Card>
      <Card title="最近动态" className="panel">
        <Timeline items={[
          { color: 'green', children: '新用户专享礼券刚刚被领取' },
          { color: 'blue', children: '夏日清凉满减券库存更新' },
          { color: 'red', children: '检测到一条高风险领券请求，等待审核' },
          { color: 'gray', children: '系统规则库已完成同步' }
        ]} />
      </Card>
    </div>
    <Card className="panel section-card" title="运营提示">
      <Title level={5}>发布前请确认库存与限领</Title>
      <Text type="secondary">活动创建后为草稿状态，确认面额、总库存、每人限领与起止时间后再发布；已发布活动可暂停但不可回到草稿。</Text>
    </Card>
  </>;
}
