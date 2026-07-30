import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger.js';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export const asyncHandler = (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => void handler(req, res, next).catch(next);

export function ok<T>(res: Response, data: T, message = 'success', status = 200): Response {
  return res.status(status).json({ code: 0, message, data });
}

export function paginated<T>(res: Response, data: T[], page: number, pageSize: number, total: number): Response {
  return res.json({ code: 0, data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}

export function pageArgs(input: { page?: number; pageSize?: number }): { page: number; pageSize: number; skip: number } {
  const page = input.page ?? 1;
  const pageSize = Math.min(input.pageSize ?? 20, 100);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

const SECRET_KEY = /password|token|secret|authorization|cookie|credential|api.?key/i;
export function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[TRUNCATED]';
  if (typeof value === 'string') return value.length > 2000 ? `${value.slice(0, 2000)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitize(item, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SECRET_KEY.test(key) ? '[REDACTED]' : sanitize(item, depth + 1)
    ]));
  }
  return value;
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`));
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  void _next;
  let appError: AppError;
  if (error instanceof AppError) appError = error;
  else if (error instanceof ZodError) appError = new AppError(400, 'VALIDATION_ERROR', '请求参数不合法', error.flatten());
  else {
    logger.error({ err: error, requestId: req.id }, 'Unhandled request error');
    appError = new AppError(500, 'INTERNAL_ERROR', '服务器内部错误');
  }
  res.status(appError.status).json({
    error: { code: appError.code, message: appError.message, requestId: req.id, ...(appError.details === undefined ? {} : { details: appError.details }) }
  });
}
