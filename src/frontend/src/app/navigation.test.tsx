import { describe, expect, it } from 'vitest';
import { navigationByRole, homeByRole } from './navigation';

describe('角色导航', () => {
  it('四个角色都有独立首页和导航', () => {
    expect(Object.keys(homeByRole)).toHaveLength(4);
    expect(navigationByRole.customer.map((item) => item.label)).toContain('我的券包');
    expect(navigationByRole.operator.map((item) => item.label)).toContain('风控审核');
    expect(navigationByRole.verifier.map((item) => item.label)).toContain('核销记录');
    expect(navigationByRole.admin.map((item) => item.label)).toContain('审计日志');
  });
});
