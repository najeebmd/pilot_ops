import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export async function getRoles(_req: Request, res: Response) {
  const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
  res.json(roles);
}

export async function getRoleById(req: Request, res: Response) {
  const id = Number(req.params.id);
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) {
    res.status(404).json({ message: 'Role not found' });
    return;
  }
  res.json(role);
}
