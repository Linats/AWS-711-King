import { useState } from 'react';
import { App as AntApp, Button, Card, Col, Flex, Row, Space, Tag, Typography } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import { BulbOutlined, CheckCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { CampaignDto } from '@coupon/shared';
import { useDemo } from '@/app/demo-context';
import { useSite } from '@/app/site-context';
import { CampaignCard } from '@/components/common/CampaignCard';
import { EmptyState } from '@/components/common/AsyncState';
import { SiteLinkCards } from '@/components/common/SiteLinks';
import { getApiError } from '@/services/api';
import { PageHeader } from '@/components/common/Page';

const { Text, Title, Paragraph } = Typography;

/** 用户主站首页：推荐 + 可领活动 + 其他角色站点入口 */
export default function CustomerHome() {
  const site = useSite();
  const { campaigns, claim } = useDemo();
  const { message } = AntApp.useApp();
  const [flying, setFlying] = useState(false);
  const active = campaigns.filter((item) => item.status === 'active');

  const doClaim = async (campaign: CampaignDto) => {
    try {
      const coupon = await claim(campaign);
      message.success(`领取成功，券码 ${coupon.code}`);
      setFlying(true);
      setTimeout(() => setFlying(false), 900);
    } catch (error) {
      message.warning(getApiError(error).message);
    }
  };

  return <>
    <PageHeader title="今天，也有好券相伴" subtitle="AI 已根据你的偏好挑选了最值得领取的优惠" extra={<Tag icon={<ThunderboltOutlined />} color="purple">智能推荐已开启</Tag>} />
    <Card className="recommend-banner panel">
      <Row align="middle" gutter={[24, 16]}>
        <Col flex="auto">
          <Tag color="purple">AI PICK</Tag>
          <Title level={2}>新用户专享礼券</Title>
          <Paragraph>结合你的近期浏览和消费偏好，这张无门槛礼券预计最适合你。</Paragraph>
          <Button type="primary" size="large" onClick={() => active[1] && doClaim(active[1])}>一键领取 ¥20</Button>
        </Col>
        <Col><div className="ai-orb"><BulbOutlined /></div></Col>
      </Row>
    </Card>

    <Flex justify="space-between" align="center" className="section-title">
      <Title level={3}>热门活动</Title>
      <Text type="secondary">实时库存，先到先得</Text>
    </Flex>
    {active.length
      ? <div className="responsive-grid">{active.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} onClaim={() => doClaim(campaign)} />)}</div>
      : <EmptyState title="暂时没有可领取的活动" description="活动上线后会第一时间出现在这里" />}

    <Flex justify="space-between" align="center" className="section-title">
      <Title level={3}>平台其他站点</Title>
      <Text type="secondary">面向工作人员，需要对应角色账号登录</Text>
    </Flex>
    <SiteLinkCards current={site.id} />

    <AnimatePresence>{flying && <motion.div className="claim-success" initial={{ opacity: 0, y: 80, scale: .7 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 160 }}>
      <Card><Space><CheckCircleOutlined className="success-icon" /><div><b>优惠券已放入券包</b><br /><Text type="secondary">现在就可以使用</Text></div></Space></Card>
    </motion.div>}</AnimatePresence>
  </>;
}
