import { Request, Response } from 'express';
import prisma from '../lib/prisma';

const SORTABLE = new Set([
  'first_name', 'last_name', 'email', 'phone',
  'city', 'country', 'date_created', 'date_updated',
]);

export async function getUsers(req: Request, res: Response) {
  const page     = Math.max(1, Number(req.query.page)     || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 10));
  const sortBy   = SORTABLE.has(String(req.query.sortBy)) ? String(req.query.sortBy) : 'date_created';
  const sortOrder: 'asc' | 'desc' = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count(),
  ]);

  res.json({ data: users, total, page, pageSize });
}

export async function getUserById(req: Request, res: Response) {
  const id = Number(req.params.id);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  res.json(user);
}

export async function createUser(req: Request, res: Response) {
  const {
    first_name, last_name, email, phone, date_of_birth,
    address_line1, address_line2, city, state, country, postal_code,
  } = req.body;

  if (!first_name || !last_name || !email) {
    res.status(400).json({ message: 'first_name, last_name, and email are required' });
    return;
  }

  const user = await prisma.user.create({
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
  });
  res.status(201).json(user);
}

export async function updateUser(req: Request, res: Response) {
  const id = Number(req.params.id);
  const {
    first_name, last_name, email, phone, date_of_birth,
    address_line1, address_line2, city, state, country, postal_code,
  } = req.body;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const user = await prisma.user.update({
    where: { id },
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
  });
  res.json(user);
}

export async function deleteUser(req: Request, res: Response) {
  const id = Number(req.params.id);

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  await prisma.user.delete({ where: { id } });
  res.status(204).send();
}
