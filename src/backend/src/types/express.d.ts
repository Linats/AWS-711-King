import type { Role } from '@coupon/shared';

declare global {
  namespace Express {
    interface Request {
      id: string;
      auth?: { userId: string; username: string; role: Role };
    }
  }
}

export {};
