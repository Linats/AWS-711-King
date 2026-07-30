import { describe, expect, it } from 'vitest';
import { createRefreshToken, hashToken } from '../src/lib/auth.js';

describe('refresh token 安全工具', () => {
  it('只暴露随机原文并生成稳定 SHA-256 哈希', () => {
    const first = createRefreshToken();
    const second = createRefreshToken();
    expect(first.raw).not.toBe(second.raw);
    expect(first.hash).toBe(hashToken(first.raw));
    expect(first.hash).toHaveLength(64);
    expect(first.hash).not.toContain(first.raw);
  });
});
