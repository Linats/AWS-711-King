import { createHash, randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@coupon/shared';
import { config } from '../config.js';
import { AppError } from './http.js';

export interface AccessClaims { sub: string; username: string; role: Role; }

export function signAccessToken(claims: AccessClaims): string {
  return jwt.sign({ username: claims.username, role: claims.role }, config.JWT_ACCESS_SECRET, {
    subject: claims.sub,
    expiresIn: config.ACCESS_TOKEN_TTL_SECONDS
  });
}

export function createRefreshToken(): { raw: string; hash: string } {
  const raw = randomBytes(48).toString('base64url');
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string { return createHash('sha256').update(raw).digest('hex'); }

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const raw = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!raw) return next(new AppError(401, 'AUTH_TOKEN_EXPIRED', '请先登录'));
  try {
    const payload = jwt.verify(raw, config.JWT_ACCESS_SECRET) as jwt.JwtPayload;
    if (!payload.sub || typeof payload.username !== 'string' || typeof payload.role !== 'string') throw new Error('invalid claims');
    req.auth = { userId: payload.sub, username: payload.username, role: payload.role as Role };
    next();
  } catch { next(new AppError(401, 'AUTH_TOKEN_EXPIRED', '登录已过期，请重新登录')); }
}

export const allowRoles = (...roles: Role[]) => (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.auth) return next(new AppError(401, 'AUTH_TOKEN_EXPIRED', '请先登录'));
  if (!roles.includes(req.auth.role)) return next(new AppError(403, 'AUTH_INSUFFICIENT_PERMISSIONS', '无权执行此操作'));
  next();
};
