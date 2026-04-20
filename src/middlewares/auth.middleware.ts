import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { User } from '../@types/user.type.js';

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authToken = req.headers.authorization;

  if (!authToken) {
    return res.status(401).json({ error: 'Token is required' });
  }

  const [, token] = authToken.split(' ');

  try {
    jwt.verify(
      token as string,
      process.env.JWT_SECRET as string,
      (err, decoded) => {
        if (err) {
          throw new Error();
        }
        req.user = decoded as User;
        return next();
      },
    );
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
