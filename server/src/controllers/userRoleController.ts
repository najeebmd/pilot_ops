import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export async function getUserRoles(req: Request, res: Response) {
  const user_id = Number(req.params.userId);
  const roles = await prisma.userRole.findMany({
    where: { user_id },
    include: { role: true },
    orderBy: { date_created: 'asc' },
  });
  res.json(roles);
}

export async function assignUserRole(req: Request, res: Response) {
  const user_id = Number(req.params.userId);
  const { role_id } = req.body;

  if (!role_id) {
    res.status(400).json({ message: 'role_id is required' });
    return;
  }

  const userExists = await prisma.user.findUnique({ where: { id: user_id } });
  if (!userExists) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const roleExists = await prisma.role.findUnique({ where: { id: Number(role_id) } });
  if (!roleExists) {
    res.status(404).json({ message: 'Role not found' });
    return;
  }

  const userRole = await prisma.userRole.create({
    data: { user_id, role_id: Number(role_id) },
    include: { role: true },
  });
  res.status(201).json(userRole);
}

export async function removeUserRole(req: Request, res: Response) {
  const user_id = Number(req.params.userId);
  const role_id = Number(req.params.roleId);

  const existing = await prisma.userRole.findUnique({
    where: { user_id_role_id: { user_id, role_id } },
  });
  if (!existing) {
    res.status(404).json({ message: 'User role assignment not found' });
    return;
  }

  await prisma.userRole.delete({ where: { user_id_role_id: { user_id, role_id } } });
  res.status(204).send();
}
