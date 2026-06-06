import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

/**
 * Middleware that:
 *  1. Requires a valid JWT (req.auth must already be set by `authenticate`)
 *  2. Checks that the user holds at least one of the allowed roles
 */
export function authorizeRoles(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const userRoles = await prisma.userRole.findMany({
      where: { user_id: req.auth.userId },
      include: { role: true },
    });

    const roleNames = userRoles.map(ur => ur.role.name as string);
    const hasRole   = allowedRoles.some(r => roleNames.includes(r));

    if (!hasRole) {
      res.status(403).json({
        message: `Access denied. Required role(s): ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
}
