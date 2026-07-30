import { Card, Flex, Space, Tag, Typography } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { otherSites, type SiteId } from '@/app/site-config';

const { Text, Title, Paragraph } = Typography;

/** 站点卡片列表：主站用它把其他三个角色站点以超链形式暴露出来。 */
export function SiteLinkCards({ current }: { current: SiteId }) {
  return <div className="site-links">
    {otherSites(current).map((site) => (
      <a key={site.id} className="site-link" href={site.url} target="_blank" rel="noreferrer" aria-label={`前往${site.brandName}（${site.audience}）`}>
        <Card className="panel" bordered={false}>
          <Flex justify="space-between" align="center">
            <span className="site-link-icon">{site.icon}</span>
            <Tag>{site.audience}</Tag>
          </Flex>
          <Title level={4}>{site.brandName}</Title>
          <Paragraph type="secondary" className="site-link-copy">{site.description}</Paragraph>
          <Flex justify="space-between" align="center">
            <Text type="secondary">演示账号 {site.accountUsernames.join(' / ')}</Text>
            <Text className="site-link-cta">访问站点 <ArrowRightOutlined /></Text>
          </Flex>
        </Card>
      </a>
    ))}
  </div>;
}

/** 紧凑超链：登录页与顶栏使用，避免登录前也需要知道其他站点地址。 */
export function SiteLinkRow({ current }: { current: SiteId }) {
  return <Space size={12} wrap className="site-link-row">
    {otherSites(current).map((site) => (
      <a key={site.id} href={site.url} target="_blank" rel="noreferrer">{site.icon} {site.brandName}</a>
    ))}
  </Space>;
}
