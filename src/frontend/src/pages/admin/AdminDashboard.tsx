import { Avatar, Badge, Card, Col, DatePicker, Descriptions, Flex, List, Progress, Row, Space, Tooltip } from 'antd';
import { AppstoreOutlined, BarChartOutlined, CheckCircleOutlined, GiftOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useDemo } from '@/app/demo-context';
import { Metric } from '@/components/common/Metric';
import { PageHeader } from '@/components/common/Page';
import { statusLabel } from '@/demo';

/** 管理员数据面板：detailed 为 /admin/stats 的补充数据视图 */
export default function AdminDashboard({ detailed = false }: { detailed?: boolean }) {
  const { campaigns, coupons, verifications, risks } = useDemo();
  const claimed = campaigns.reduce((sum, item) => sum + item.totalStock - item.remainingStock, 0);
  const rate = claimed ? Math.round(verifications.length / claimed * 1000) / 10 : 0;
  const trend = [12, 18, 15, 28, 34, 42, 38].map((value, index) => ({ day: `${index + 24}日`, claims: value }));

  return <>
    <PageHeader
      title={detailed ? '数据分析' : '数据总览'}
      subtitle={detailed ? '按时间范围下钻领取与核销趋势，核对券包状态分布' : '平台关键指标实时汇总，异常信号优先呈现'}
      extra={<DatePicker.RangePicker />}
    />
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} xl={6}><Metric title="累计活动" value={campaigns.length} icon={<AppstoreOutlined />} color="#7c3aed" /></Col>
      <Col xs={24} sm={12} xl={6}><Metric title="累计发券" value={claimed} icon={<GiftOutlined />} color="#18a058" /></Col>
      <Col xs={24} sm={12} xl={6}><Metric title="核销数量" value={verifications.length} icon={<CheckCircleOutlined />} color="#f59e0b" /></Col>
      <Col xs={24} sm={12} xl={6}><Metric title="核销率" value={rate} suffix="%" icon={<BarChartOutlined />} color="#db2777" /></Col>
    </Row>
    <div className="two-grid dashboard-grid">
      <Card title="近 7 日领取趋势" className="panel">
        <div className="simple-chart">{trend.map((item) => <Tooltip key={item.day} title={`${item.day} 领取 ${item.claims}`}>
          <div><span style={{ height: `${item.claims * 3}px` }} /><small>{item.day}</small></div>
        </Tooltip>)}</div>
      </Card>
      <Card title="活动状态分布" className="panel">
        <Flex justify="space-around" align="center" className="donut-wrap">
          <Progress type="dashboard" percent={Math.round(campaigns.filter((item) => item.status === 'active').length / campaigns.length * 100)} strokeColor="#7c3aed" format={(percent) => `${percent}% 进行中`} />
          <Space direction="vertical">{['active', 'draft', 'paused'].map((status) => <Badge
            key={status} color={status === 'active' ? '#7c3aed' : status === 'draft' ? '#18a058' : '#f59e0b'}
            text={`${statusLabel[status]} ${campaigns.filter((item) => item.status === status).length}`}
          />)}</Space>
        </Flex>
      </Card>
    </div>
    <Card title="近期风险告警（只读）" className="panel section-card">
      <List dataSource={risks} renderItem={(item) => <List.Item extra={<Badge color={item.riskScore > 70 ? '#ef4444' : '#f59e0b'} text={`风险分 ${item.riskScore}`} />}>
        <List.Item.Meta
          avatar={<Avatar icon={<SafetyCertificateOutlined />} />}
          title={`${item.username} · ${item.campaignName}`}
          description={`${item.reasons.join('；')} · ${new Date(item.createdAt).toLocaleString()}`}
        />
      </List.Item>} />
    </Card>
    {detailed && <Card title="券包状态补充数据" className="panel section-card">
      <Descriptions column={{ xs: 1, sm: 3 }} items={[
        { key: '1', label: '当前可用券', children: coupons.filter((item) => item.status === 'claimed').length },
        { key: '2', label: '已使用券', children: coupons.filter((item) => item.status === 'verified').length },
        { key: '3', label: '过期券', children: coupons.filter((item) => item.status === 'expired').length }
      ]} />
    </Card>}
  </>;
}
