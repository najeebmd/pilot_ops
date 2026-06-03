import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../lib/jwt';

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing or invalid Authorization header' });
    return;
  }

  try {
    req.auth = verifyToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ message: 'Token expired or invalid' });
  }
}
