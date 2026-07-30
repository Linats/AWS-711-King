import type { ReactNode } from 'react';
import { Card, Flex, Statistic } from 'antd';

export function Metric({ title, value, suffix, icon, color }: { title: string; value: number; suffix?: string; icon: ReactNode; color: string }) {
  return <Card className="metric-card panel">
    <Flex justify="space-between" align="center">
      <Statistic title={title} value={value} suffix={suffix} />
      <span className="metric-icon" style={{ color, background: `${color}18` }}>{icon}</span>
    </Flex>
  </Card>;
}
