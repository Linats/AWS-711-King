import { Button, Card, Flex, Progress, Tag, Typography } from 'antd';
import type { CampaignDto } from '@coupon/shared';

const { Text, Title, Paragraph } = Typography;

export function CampaignCard({ campaign, onClaim }: { campaign: CampaignDto; onClaim?: () => void }) {
  const percentage = Math.round((campaign.remainingStock / campaign.totalStock) * 100);
  return <Card className="coupon-card panel" hoverable>
    <Flex justify="space-between" align="start">
      <Tag color={campaign.couponType === 'discount' ? 'purple' : 'blue'}>{campaign.couponType === 'discount' ? '折扣券' : '满减券'}</Tag>
      <Text type="secondary">剩余 {campaign.remainingStock}</Text>
    </Flex>
    <div className="coupon-value">{campaign.couponType === 'discount' ? <><b>{campaign.value}</b><span>折</span></> : <><span>¥</span><b>{campaign.value}</b></>}</div>
    <Title level={4}>{campaign.name}</Title>
    <Paragraph type="secondary" ellipsis={{ rows: 2 }}>{campaign.description}</Paragraph>
    <Progress percent={percentage} showInfo={false} strokeColor={{ from: '#5b6df9', to: '#9c6df9' }} />
    <Flex justify="space-between">
      <Text type="secondary">每人限领 {campaign.perUserLimit} 张</Text>
      {onClaim && <Button type="primary" onClick={onClaim}>立即领取</Button>}
    </Flex>
  </Card>;
}
