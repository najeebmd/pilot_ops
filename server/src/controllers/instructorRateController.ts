import { Request, Response } from 'express';
import prisma from '../lib/prisma';

const includeInstructor = {
  instructor: { select: { id: true, first_name: true, last_name: true, email: true } },
} as const;

async function assertInstructor(instructor_id: number): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: instructor_id },
    include: { roles: { include: { role: true } } },
  });
  if (!user) return 'User not found';
  if (!user.roles.some(r => r.role.name === 'INSTRUCTOR'))
    return 'User does not have the INSTRUCTOR role';
  return null;
}

// GET /api/instructor-rates
export async function getRates(_req: Request, res: Response) {
  const rates = await prisma.instructorRate.findMany({
    include: includeInstructor,
    orderBy: { instructor: { first_name: 'asc' } },
  });
  res.json(rates);
}

// GET /api/instructor-rates/:instructorId
export async function getRateByInstructor(req: Request, res: Response) {
  const instructor_id = Number(req.params.instructorId);
  const rate = await prisma.instructorRate.findUnique({
    where: { instructor_id },
    include: includeInstructor,
  });
  if (!rate) {
    res.status(404).json({ message: 'No rate found for this instructor' });
    return;
  }
  res.json(rate);
}

// POST /api/instructor-rates
export async function createRate(req: Request, res: Response) {
  const { instructor_id, regular_rate } = req.body;

  if (!instructor_id || regular_rate == null) {
    res.status(400).json({ message: 'instructor_id and regular_rate are required' });
    return;
  }
  if (isNaN(Number(regular_rate)) || Number(regular_rate) < 0) {
    res.status(400).json({ message: 'regular_rate must be a non-negative number' });
    return;
  }

  const err = await assertInstructor(Number(instructor_id));
  if (err) { res.status(422).json({ message: err }); return; }

  const existing = await prisma.instructorRate.findUnique({ where: { instructor_id: Number(instructor_id) } });
  if (existing) {
    res.status(409).json({ message: 'A rate already exists for this instructor. Use PUT to update it.' });
    return;
  }

  const rate = await prisma.instructorRate.create({
    data: { instructor_id: Number(instructor_id), regular_rate: Number(regular_rate) },
    include: includeInstructor,
  });
  res.status(201).json(rate);
}

// PUT /api/instructor-rates/:instructorId
export async function updateRate(req: Request, res: Response) {
  const instructor_id = Number(req.params.instructorId);
  const { regular_rate } = req.body;

  if (regular_rate == null) {
    res.status(400).json({ message: 'regular_rate is required' });
    return;
  }
  if (isNaN(Number(regular_rate)) || Number(regular_rate) < 0) {
    res.status(400).json({ message: 'regular_rate must be a non-negative number' });
    return;
  }

  const existing = await prisma.instructorRate.findUnique({ where: { instructor_id } });
  if (!existing) {
    res.status(404).json({ message: 'No rate found for this instructor' });
    return;
  }

  const rate = await prisma.instructorRate.update({
    where: { instructor_id },
    data:  { regular_rate: Number(regular_rate) },
    include: includeInstructor,
  });
  res.json(rate);
}

// DELETE /api/instructor-rates/:instructorId
export async function deleteRate(req: Request, res: Response) {
  const instructor_id = Number(req.params.instructorId);
  const existing = await prisma.instructorRate.findUnique({ where: { instructor_id } });
  if (!existing) {
    res.status(404).json({ message: 'No rate found for this instructor' });
    return;
  }
  await prisma.instructorRate.delete({ where: { instructor_id } });
  res.status(204).send();
}
