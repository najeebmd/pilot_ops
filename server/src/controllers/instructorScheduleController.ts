import { Request, Response } from 'express';
import { ActivityType } from '@prisma/client';
import prisma from '../lib/prisma';

const VALID_ACTIVITY_TYPES = new Set<string>(['INSTRUCTION', 'OTHER', 'NOT_AVAILABLE']);

const SORTABLE = new Set(['date_start', 'date_end', 'activity_type', 'date_created']);

const includeInstructor = {
  instructor: {
    select: { id: true, first_name: true, last_name: true, email: true },
  },
} as const;

/** Verify the user exists and holds the INSTRUCTOR role */
async function assertInstructor(instructor_id: number): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: instructor_id },
    include: { roles: { include: { role: true } } },
  });
  if (!user) return 'Instructor not found';
  const isInstructor = user.roles.some((r) => r.role.name === 'INSTRUCTOR');
  if (!isInstructor) return 'User does not have the INSTRUCTOR role';
  return null;
}

// ── GET /api/instructor-schedule ─────────────────────────────────────────────
export async function getSchedules(req: Request, res: Response) {
  const page      = Math.max(1, Number(req.query.page)     || 1);
  const pageSize  = Math.min(100, Math.max(1, Number(req.query.pageSize) || 10));
  const sortBy    = SORTABLE.has(String(req.query.sortBy)) ? String(req.query.sortBy) : 'date_start';
  const sortOrder: 'asc' | 'desc' = req.query.sortOrder === 'desc' ? 'desc' : 'asc';

  // Optional filter by instructor
  const instructorId = req.query.instructor_id ? Number(req.query.instructor_id) : undefined;
  const where = instructorId ? { instructor_id: instructorId } : {};

  const [schedules, total] = await Promise.all([
    prisma.instructorSchedule.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: includeInstructor,
    }),
    prisma.instructorSchedule.count({ where }),
  ]);

  res.json({ data: schedules, total, page, pageSize });
}

// ── GET /api/instructor-schedule/:id ─────────────────────────────────────────
export async function getScheduleById(req: Request, res: Response) {
  const id = Number(req.params.id);
  const schedule = await prisma.instructorSchedule.findUnique({
    where: { id },
    include: includeInstructor,
  });
  if (!schedule) {
    res.status(404).json({ message: 'Schedule entry not found' });
    return;
  }
  res.json(schedule);
}

// ── POST /api/instructor-schedule ────────────────────────────────────────────
export async function createSchedule(req: Request, res: Response) {
  const { instructor_id, date_start, date_end, activity_type } = req.body;

  if (!instructor_id || !date_start || !date_end || !activity_type) {
    res.status(400).json({ message: 'instructor_id, date_start, date_end and activity_type are required' });
    return;
  }

  if (!VALID_ACTIVITY_TYPES.has(String(activity_type).toUpperCase())) {
    res.status(400).json({ message: `activity_type must be one of: ${[...VALID_ACTIVITY_TYPES].join(', ')}` });
    return;
  }

  const start = new Date(date_start);
  const end   = new Date(date_end);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ message: 'date_start and date_end must be valid ISO date-time strings' });
    return;
  }
  if (end <= start) {
    res.status(400).json({ message: 'date_end must be after date_start' });
    return;
  }

  const err = await assertInstructor(Number(instructor_id));
  if (err) { res.status(422).json({ message: err }); return; }

  const schedule = await prisma.instructorSchedule.create({
    data: {
      instructor_id: Number(instructor_id),
      date_start:    start,
      date_end:      end,
      activity_type: activity_type.toUpperCase() as ActivityType,
    },
    include: includeInstructor,
  });
  res.status(201).json(schedule);
}

// ── PUT /api/instructor-schedule/:id ─────────────────────────────────────────
export async function updateSchedule(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { instructor_id, date_start, date_end, activity_type } = req.body;

  const existing = await prisma.instructorSchedule.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: 'Schedule entry not found' });
    return;
  }

  if (activity_type && !VALID_ACTIVITY_TYPES.has(String(activity_type).toUpperCase())) {
    res.status(400).json({ message: `activity_type must be one of: ${[...VALID_ACTIVITY_TYPES].join(', ')}` });
    return;
  }

  const start = date_start ? new Date(date_start) : existing.date_start;
  const end   = date_end   ? new Date(date_end)   : existing.date_end;
  if (end <= start) {
    res.status(400).json({ message: 'date_end must be after date_start' });
    return;
  }

  if (instructor_id && Number(instructor_id) !== existing.instructor_id) {
    const err = await assertInstructor(Number(instructor_id));
    if (err) { res.status(422).json({ message: err }); return; }
  }

  const schedule = await prisma.instructorSchedule.update({
    where: { id },
    data: {
      instructor_id: instructor_id ? Number(instructor_id) : undefined,
      date_start:    start,
      date_end:      end,
      activity_type: activity_type ? (activity_type.toUpperCase() as ActivityType) : undefined,
    },
    include: includeInstructor,
  });
  res.json(schedule);
}

// ── DELETE /api/instructor-schedule/:id ──────────────────────────────────────
export async function deleteSchedule(req: Request, res: Response) {
  const id = Number(req.params.id);
  const existing = await prisma.instructorSchedule.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: 'Schedule entry not found' });
    return;
  }
  await prisma.instructorSchedule.delete({ where: { id } });
  res.status(204).send();
}
