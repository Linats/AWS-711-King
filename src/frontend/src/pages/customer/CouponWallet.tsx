import { useState } from 'react';
import { Badge, Button, Card, Flex, Segmented, Tag, Typography } from 'antd';
import { GiftOutlined } from '@ant-design/icons';
import { useDemo } from '@/app/demo-context';
import { EmptyState } from '@/components/common/AsyncState';
import { Money, PageHeader } from '@/components/common/Page';
import { statusLabel } from '@/demo';

const { Text, Title } = Typography;

/** 用户券包：四种状态筛选，按领取时间倒序 */
export default function CouponWallet() {
  const { coupons } = useDemo();
  const [filter, setFilter] = useState('all');
  const shown = coupons.filter((coupon) => filter === 'all'
    || (filter === 'usable' && coupon.status === 'claimed')
    || (filter === 'used' && coupon.status === 'verified')
    || (filter === 'expired' && coupon.status === 'expired'));

  return <>
    <PageHeader
      title="我的券包" subtitle="管理你领取的所有优惠券，注意即将到期的券"
      extra={<Badge count={coupons.filter((item) => item.status === 'claimed').length} showZero><GiftOutlined className="header-icon" /></Badge>}
    />
    <Segmented
      value={filter} onChange={(value) => setFilter(String(value))} className="filter-bar"
      options={[{ value: 'all', label: '全部' }, { value: 'usable', label: '可使用' }, { value: 'used', label: '已使用' }, { value: 'expired', label: '已过期' }]}
    />
    {shown.length
      ? <div className="responsive-grid">{shown.map((coupon) => <Card key={coupon.id} className={`wallet-card ${coupon.status !== 'claimed' ? 'coupon-muted' : ''}`}>
        <Flex justify="space-between">
          <Tag color={coupon.status === 'claimed' ? 'green' : 'default'}>{statusLabel[coupon.status]}</Tag>
          <Text copyable={{ text: coupon.code }}>{coupon.code}</Text>
        </Flex>
        <div className="wallet-value"><Money value={coupon.value} /></div>
        <Title level={4}>{coupon.campaignName}</Title>
        <Text type="secondary">有效期至 {new Date(coupon.expiresAt).toLocaleDateString()}</Text>
        <div className="coupon-dash" />
        <Button type={coupon.status === 'claimed' ? 'primary' : 'default'} block disabled={coupon.status !== 'claimed'}>
          {coupon.status === 'claimed' ? '去使用' : statusLabel[coupon.status]}
        </Button>
      </Card>)}</div>
      : <EmptyState title="这里还没有优惠券" description="去首页发现更多优惠活动吧" />}
  </>;
}
