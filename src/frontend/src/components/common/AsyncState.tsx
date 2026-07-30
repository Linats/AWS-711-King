import { Alert, Button, Empty, Result, Skeleton, Space, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

export function LoadingState({ label = '正在加载数据…', rows = 4 }: { label?: string; rows?: number }) {
  return <div role="status" aria-label={label}><Skeleton active paragraph={{ rows }} /></div>;
}
export function EmptyState({ title = '暂无数据', description = '当前条件下没有可展示的内容', action }: { title?: string; description?: string; action?: React.ReactNode }) {
  return <Empty description={<Space direction="vertical"><Typography.Text strong>{title}</Typography.Text><Typography.Text type="secondary">{description}</Typography.Text>{action}</Space>} />;
}
export function ErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return <Alert role="alert" type="error" showIcon message="加载失败" description={error} action={onRetry ? <Button icon={<ReloadOutlined />} onClick={onRetry}>重试</Button> : undefined} />;
}
export function ForbiddenPage() { return <Result status="403" title="403" subTitle="你没有权限访问此页面" extra={<Button type="primary" href="/">返回角色首页</Button>} />; }
export function NotFoundPage() { return <Result status="404" title="404" subTitle="页面不存在或已被移动" extra={<Button type="primary" href="/">返回首页</Button>} />; }
