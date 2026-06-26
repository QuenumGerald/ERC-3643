import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthenticatedRequest extends Request {
  user?: {
    issuerId: string;
    role: 'ADMIN' | 'ISSUER';
  };
}

export function authMiddleware(allowedRoles: ('ADMIN' | 'ISSUER')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header is missing' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Token format must be Bearer <token>' });
    }

    const token = parts[1];

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as {
        issuerId: string;
        role: 'ADMIN' | 'ISSUER';
      };

      if (!decoded.issuerId || !decoded.role) {
        return res.status(401).json({ error: 'Invalid token payload structure' });
      }

      if (!allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }

      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}
