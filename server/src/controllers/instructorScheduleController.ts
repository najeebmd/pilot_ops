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

/** Check for overlapping schedule entries for the same instructor.
 *  Two ranges overlap when: start1 < end2 AND start2 < end1
 *  excludeId skips the current entry when updating.
 */
async function checkConflict(
  instructor_id: number,
  start: Date,
  end: Date,
  excludeId?: number,
): Promise<string | null> {
  const conflict = await prisma.instructorSchedule.findFirst({
    where: {
      instructor_id,
      id:         excludeId ? { not: excludeId } : undefined,
      date_start: { lt: end },
      date_end:   { gt: start },
    },
    include: {
      instructor: { select: { first_name: true, last_name: true } },
    },
  });

  if (!conflict) return null;

  const fmt = (d: Date) =>
    d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });

  return (
    `Schedule conflict: ${conflict.instructor.first_name} ${conflict.instructor.last_name} ` +
    `already has a "${conflict.activity_type}" entry from ` +
    `${fmt(conflict.date_start)} to ${fmt(conflict.date_end)} (id: ${conflict.id})`
  );
}

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

  const instructorId = req.query.instructor_id ? Number(req.query.instructor_id) : undefined;
  const dateFrom     = req.query.date_from ? new Date(String(req.query.date_from)) : undefined;
  const dateTo       = req.query.date_to   ? new Date(String(req.query.date_to))   : undefined;

  const where: Record<string, unknown> = {};
  if (instructorId)              where.instructor_id = instructorId;
  // Return entries that overlap with [dateFrom, dateTo]
  if (dateFrom || dateTo) {
    where.date_start = dateTo   ? { lt: dateTo }   : undefined;
    where.date_end   = dateFrom ? { gt: dateFrom } : undefined;
    if (!where.date_start) delete where.date_start;
    if (!where.date_end)   delete where.date_end;
  }

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

  const conflict = await checkConflict(Number(instructor_id), start, end);
  if (conflict) { res.status(409).json({ message: conflict }); return; }

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

  const resolvedInstructorId = instructor_id ? Number(instructor_id) : existing.instructor_id;

  if (instructor_id && Number(instructor_id) !== existing.instructor_id) {
    const err = await assertInstructor(resolvedInstructorId);
    if (err) { res.status(422).json({ message: err }); return; }
  }

  const conflict = await checkConflict(resolvedInstructorId, start, end, id);
  if (conflict) { res.status(409).json({ message: conflict }); return; }

  const schedule = await prisma.instructorSchedule.update({
    where: { id },
    data: {
      instructor_id: resolvedInstructorId,
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
