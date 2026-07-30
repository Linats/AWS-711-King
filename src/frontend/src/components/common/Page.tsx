import { Typography } from 'antd';
export function PageHeader({ title, subtitle, extra }: { title: string; subtitle: string; extra?: React.ReactNode }) {
  return <div className="page-header flex flex-wrap items-start justify-between gap-3"><div><h1 className="page-title">{title}</h1><p className="page-subtitle">{subtitle}</p></div>{extra}</div>;
}
export function Money({ value }: { value: number }) { return <Typography.Text strong>¥{Number(value).toFixed(2)}</Typography.Text>; }
