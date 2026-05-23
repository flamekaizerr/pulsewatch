import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_later';
const isProd = process.env.NODE_ENV === 'production';

// Cookie options helper
const getCookieOptions = () => ({
  httpOnly: true,
  secure: isProd, // Must be secure in prod for SameSite=None
  sameSite: isProd ? ('none' as const) : ('lax' as const),
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string(),
});

export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.cookie('jwt', token, getCookieOptions());
    return res.status(201).json({
      message: 'User registered successfully',
      user: { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.cookie('jwt', token, getCookieOptions());
    return res.status(200).json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie('jwt', getCookieOptions());
  return res.status(200).json({ message: 'Logged out successfully' });
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      user: { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
};

// Seeder-friendly demo user logging
export const demoLogin = async (req: Request, res: Response) => {
  const demoEmail = 'admin@pulsewatch.com';

  try {
    let user = await prisma.user.findUnique({ where: { email: demoEmail } });

    if (!user) {
      const passwordHash = await bcrypt.hash('demo1234', 10);
      user = await prisma.user.create({
        data: {
          email: demoEmail,
          passwordHash,
        },
      });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.cookie('jwt', token, getCookieOptions());
    return res.status(200).json({
      message: 'Demo login successful',
      user: { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
};
