import type { Request, Response, NextFunction } from "express";

/**
 * Placeholder for JWT auth and role-based guard.
 * Will validate Authorization: Bearer <token> and attach user/role to req.
 * For now, passes through to next().
 */
export const requireAuth = (_req: Request, _res: Response, next: NextFunction): void => {
  next();
};

/**
 * Placeholder for ADMIN-only guard. Use after requireAuth.
 * For now, passes through to next().
 */
export const requireAdmin = (_req: Request, _res: Response, next: NextFunction): void => {
  next();
};
