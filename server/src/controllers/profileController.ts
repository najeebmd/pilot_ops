import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma';

// GET /api/profile — current user's full profile
export async function getProfile(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    include: {
      roles: { include: { role: true } },
      login: { select: { username: true } },
    },
  });
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }
  res.json(user);
}

// PUT /api/profile — update personal details
export async function updateProfile(req: Request, res: Response) {
  const {
    first_name, last_name, email, phone, date_of_birth,
    address_line1, address_line2, city, state, country, postal_code,
  } = req.body;

  if (email) {
    const taken = await prisma.user.findFirst({
      where: { email, NOT: { id: req.auth!.userId } },
    });
    if (taken) { res.status(409).json({ message: 'Email is already in use' }); return; }
  }

  const user = await prisma.user.update({
    where: { id: req.auth!.userId },
    data: {
      first_name,
      last_name,
      email,
      phone,
      date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
      address_line1,
      address_line2,
      city,
      state,
      country,
      postal_code,
    },
    include: {
      roles: { include: { role: true } },
      login: { select: { username: true } },
    },
  });
  res.json(user);
}

// PUT /api/profile/password — change password
export async function changePassword(req: Request, res: Response) {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    res.status(400).json({ message: 'current_password and new_password are required' });
    return;
  }
  if (new_password.length < 8) {
    res.status(400).json({ message: 'New password must be at least 8 characters' });
    return;
  }

  const login = await prisma.userLogin.findUnique({ where: { user_id: req.auth!.userId } });
  if (!login) { res.status(404).json({ message: 'Login not found' }); return; }

  const valid = await bcrypt.compare(current_password, login.password);
  if (!valid) { res.status(401).json({ message: 'Current password is incorrect' }); return; }

  await prisma.userLogin.update({
    where: { user_id: req.auth!.userId },
    data:  { password: await bcrypt.hash(new_password, 10) },
  });

  res.json({ message: 'Password updated successfully' });
}
