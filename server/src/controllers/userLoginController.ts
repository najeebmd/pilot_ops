import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma';

const SALT_ROUNDS = 10;

export async function getUserLogin(req: Request, res: Response) {
  const user_id = Number(req.params.userId);
  const login = await prisma.userLogin.findUnique({
    where: { user_id },
    select: { id: true, user_id: true, username: true, date_created: true, date_updated: true },
  });
  if (!login) {
    res.status(404).json({ message: 'Login not found' });
    return;
  }
  res.json(login);
}

export async function createUserLogin(req: Request, res: Response) {
  const user_id = Number(req.params.userId);
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ message: 'username and password are required' });
    return;
  }

  const userExists = await prisma.user.findUnique({ where: { id: user_id } });
  if (!userExists) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const login = await prisma.userLogin.create({
    data: { user_id, username, password: hashed },
    select: { id: true, user_id: true, username: true, date_created: true, date_updated: true },
  });
  res.status(201).json(login);
}

export async function updateUserLogin(req: Request, res: Response) {
  const user_id = Number(req.params.userId);
  const { username, password } = req.body;

  const existing = await prisma.userLogin.findUnique({ where: { user_id } });
  if (!existing) {
    res.status(404).json({ message: 'Login not found' });
    return;
  }

  const data: { username?: string; password?: string } = {};
  if (username) data.username = username;
  if (password) data.password = await bcrypt.hash(password, SALT_ROUNDS);

  const login = await prisma.userLogin.update({
    where: { user_id },
    data,
    select: { id: true, user_id: true, username: true, date_created: true, date_updated: true },
  });
  res.json(login);
}

// Admin/Staff: reset any user's password without needing the current one
export async function resetUserPassword(req: Request, res: Response) {
  const user_id = Number(req.params.userId);
  const { new_password } = req.body;

  if (!new_password || String(new_password).length < 8) {
    res.status(400).json({ message: 'new_password must be at least 8 characters' });
    return;
  }

  const existing = await prisma.userLogin.findUnique({ where: { user_id } });
  if (!existing) {
    res.status(404).json({ message: 'Login not found for this user' });
    return;
  }

  await prisma.userLogin.update({
    where: { user_id },
    data:  { password: await bcrypt.hash(String(new_password), SALT_ROUNDS) },
  });

  res.json({ message: 'Password reset successfully' });
}

export async function deleteUserLogin(req: Request, res: Response) {
  const user_id = Number(req.params.userId);

  const existing = await prisma.userLogin.findUnique({ where: { user_id } });
  if (!existing) {
    res.status(404).json({ message: 'Login not found' });
    return;
  }

  await prisma.userLogin.delete({ where: { user_id } });
  res.status(204).send();
}
