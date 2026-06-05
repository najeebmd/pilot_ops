import { Request, Response } from 'express';
import { ReservationStatus } from '@prisma/client';
import prisma from '../lib/prisma';

const VALID_STATUSES = new Set<string>(['RESERVED', 'COMPLETED', 'CANCELED']);
const SORTABLE = new Set([
  'date_start', 'date_end', 'status', 'date_created', 'date_updated',
]);

const includeRelations = {
  user:       { select: { id: true, first_name: true, last_name: true, email: true } },
  aircraft:   { select: { id: true, tail_number: true, make: true, model: true } },
  instructor: { select: { id: true, first_name: true, last_name: true, email: true } },
  instructor_schedule: { select: { id: true } },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (d: Date) =>
  d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

async function assertInstructor(instructor_id: number): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: instructor_id },
    include: { roles: { include: { role: true } } },
  });
  if (!user) return 'Instructor not found';
  if (!user.roles.some((r) => r.role.name === 'INSTRUCTOR'))
    return 'User does not have the INSTRUCTOR role';
  return null;
}

/** Check for overlapping non-CANCELED reservations for the same aircraft. */
async function checkAircraftConflict(
  aircraft_id: number, start: Date, end: Date, excludeId?: number,
): Promise<string | null> {
  const conflict = await prisma.reservation.findFirst({
    where: {
      aircraft_id,
      status:     { not: 'CANCELED' },
      id:         excludeId ? { not: excludeId } : undefined,
      date_start: { lt: end },
      date_end:   { gt: start },
    },
    include: { aircraft: { select: { tail_number: true } } },
  });
  if (!conflict) return null;
  return `Aircraft conflict: ${conflict.aircraft?.tail_number ?? `id ${aircraft_id}`} already has a reservation from ${fmt(conflict.date_start)} to ${fmt(conflict.date_end)} (reservation id: ${conflict.id})`;
}

/** Check for overlapping non-CANCELED reservations for the same instructor. */
async function checkInstructorReservationConflict(
  instructor_id: number, start: Date, end: Date, excludeId?: number,
): Promise<string | null> {
  const conflict = await prisma.reservation.findFirst({
    where: {
      instructor_id,
      status:     { not: 'CANCELED' },
      id:         excludeId ? { not: excludeId } : undefined,
      date_start: { lt: end },
      date_end:   { gt: start },
    },
    include: { instructor: { select: { first_name: true, last_name: true } } },
  });
  if (!conflict) return null;
  const name = conflict.instructor
    ? `${conflict.instructor.first_name} ${conflict.instructor.last_name}`
    : `Instructor id ${instructor_id}`;
  return `Instructor conflict: ${name} already has a reservation from ${fmt(conflict.date_start)} to ${fmt(conflict.date_end)} (reservation id: ${conflict.id})`;
}

/** Check instructor_schedule for blocks that overlap the requested time.
 *  Manually-entered NOT_AVAILABLE or other blocks prevent booking. */
async function checkInstructorScheduleConflict(
  instructor_id: number, start: Date, end: Date, excludeReservationId?: number,
): Promise<string | null> {
  const conflict = await prisma.instructorSchedule.findFirst({
    where: {
      instructor_id,
      // Ignore the schedule entry that belongs to the reservation being updated
      reservation_id: excludeReservationId
        ? { not: excludeReservationId }
        : undefined,
      date_start: { lt: end },
      date_end:   { gt: start },
    },
    include: { instructor: { select: { first_name: true, last_name: true } } },
  });
  if (!conflict) return null;
  const name = conflict.instructor
    ? `${conflict.instructor.first_name} ${conflict.instructor.last_name}`
    : `Instructor id ${instructor_id}`;
  return `Instructor unavailable: ${name} has a "${conflict.activity_type}" block from ${fmt(conflict.date_start)} to ${fmt(conflict.date_end)} (schedule id: ${conflict.id})`;
}

/** Create an InstructorSchedule entry linked to a reservation. */
async function createLinkedScheduleEntry(
  instructor_id: number, reservation_id: number, start: Date, end: Date,
) {
  await prisma.instructorSchedule.create({
    data: {
      instructor_id,
      reservation_id,
      date_start:    start,
      date_end:      end,
      activity_type: 'INSTRUCTION',
    },
  });
}

/** Update the InstructorSchedule entry linked to a reservation (if it exists). */
async function updateLinkedScheduleEntry(
  reservation_id: number,
  instructor_id: number,
  start: Date,
  end: Date,
) {
  const existing = await prisma.instructorSchedule.findUnique({ where: { reservation_id } });
  if (!existing) {
    // Entry was manually deleted — recreate it
    await createLinkedScheduleEntry(instructor_id, reservation_id, start, end);
    return;
  }
  await prisma.instructorSchedule.update({
    where: { reservation_id },
    data:  { instructor_id, date_start: start, date_end: end },
  });
}

/** Delete the InstructorSchedule entry linked to a reservation (on cancel). */
async function deleteLinkedScheduleEntry(reservation_id: number) {
  await prisma.instructorSchedule.deleteMany({ where: { reservation_id } });
}

// ── GET /api/reservations ─────────────────────────────────────────────────────
export async function getReservations(req: Request, res: Response) {
  const page      = Math.max(1, Number(req.query.page)     || 1);
  const pageSize  = Math.min(100, Math.max(1, Number(req.query.pageSize) || 10));
  const sortBy    = SORTABLE.has(String(req.query.sortBy)) ? String(req.query.sortBy) : 'date_start';
  const sortOrder: 'asc' | 'desc' = req.query.sortOrder === 'desc' ? 'desc' : 'asc';

  const where: Record<string, unknown> = {};
  if (req.query.user_id)       where.user_id       = Number(req.query.user_id);
  if (req.query.aircraft_id)   where.aircraft_id   = Number(req.query.aircraft_id);
  if (req.query.instructor_id) where.instructor_id = Number(req.query.instructor_id);
  if (req.query.status && VALID_STATUSES.has(String(req.query.status).toUpperCase()))
    where.status = String(req.query.status).toUpperCase();

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: includeRelations,
    }),
    prisma.reservation.count({ where }),
  ]);
  res.json({ data: reservations, total, page, pageSize });
}

// ── GET /api/reservations/:id ─────────────────────────────────────────────────
export async function getReservationById(req: Request, res: Response) {
  const id = Number(req.params.id);
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: includeRelations,
  });
  if (!reservation) { res.status(404).json({ message: 'Reservation not found' }); return; }
  res.json(reservation);
}

// ── POST /api/reservations ────────────────────────────────────────────────────
export async function createReservation(req: Request, res: Response) {
  const { user_id, aircraft_id, instructor_id, date_start, date_end, status } = req.body;

  if (!user_id || !date_start || !date_end) {
    res.status(400).json({ message: 'user_id, date_start and date_end are required' });
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
  if (status && !VALID_STATUSES.has(String(status).toUpperCase())) {
    res.status(400).json({ message: `status must be one of: ${[...VALID_STATUSES].join(', ')}` });
    return;
  }

  const userExists = await prisma.user.findUnique({ where: { id: Number(user_id) } });
  if (!userExists) { res.status(404).json({ message: 'User not found' }); return; }

  if (aircraft_id) {
    const aircraftExists = await prisma.aircraft.findUnique({ where: { id: Number(aircraft_id) } });
    if (!aircraftExists) { res.status(404).json({ message: 'Aircraft not found' }); return; }
    const conflict = await checkAircraftConflict(Number(aircraft_id), start, end);
    if (conflict) { res.status(409).json({ message: conflict }); return; }
  }

  if (instructor_id) {
    const err = await assertInstructor(Number(instructor_id));
    if (err) { res.status(422).json({ message: err }); return; }

    // Check instructor's existing reservations
    const reservationConflict = await checkInstructorReservationConflict(Number(instructor_id), start, end);
    if (reservationConflict) { res.status(409).json({ message: reservationConflict }); return; }

    // Check instructor's manual schedule blocks (NOT_AVAILABLE, etc.)
    const scheduleConflict = await checkInstructorScheduleConflict(Number(instructor_id), start, end);
    if (scheduleConflict) { res.status(409).json({ message: scheduleConflict }); return; }
  }

  const reservation = await prisma.reservation.create({
    data: {
      user_id:       Number(user_id),
      aircraft_id:   aircraft_id   ? Number(aircraft_id)   : null,
      instructor_id: instructor_id ? Number(instructor_id) : null,
      date_start:    start,
      date_end:      end,
      status:        status ? String(status).toUpperCase() as ReservationStatus : 'RESERVED',
    },
    include: includeRelations,
  });

  // Auto-create instructor schedule entry
  if (instructor_id && reservation.status === 'RESERVED') {
    await createLinkedScheduleEntry(Number(instructor_id), reservation.id, start, end);
  }

  res.status(201).json(reservation);
}

// ── PUT /api/reservations/:id ─────────────────────────────────────────────────
export async function updateReservation(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { user_id, aircraft_id, instructor_id, date_start, date_end, status } = req.body;

  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) { res.status(404).json({ message: 'Reservation not found' }); return; }

  if (status && !VALID_STATUSES.has(String(status).toUpperCase())) {
    res.status(400).json({ message: `status must be one of: ${[...VALID_STATUSES].join(', ')}` });
    return;
  }

  const start = date_start ? new Date(date_start) : existing.date_start;
  const end   = date_end   ? new Date(date_end)   : existing.date_end;
  if (end <= start) {
    res.status(400).json({ message: 'date_end must be after date_start' });
    return;
  }

  const resolvedAircraftId   = aircraft_id   !== undefined ? (aircraft_id   ? Number(aircraft_id)   : null) : existing.aircraft_id;
  const resolvedInstructorId = instructor_id !== undefined ? (instructor_id ? Number(instructor_id) : null) : existing.instructor_id;
  const resolvedStatus       = status ? String(status).toUpperCase() as ReservationStatus : existing.status;

  const isCanceling = resolvedStatus === 'CANCELED' && existing.status !== 'CANCELED';

  if (resolvedAircraftId && !isCanceling) {
    const conflict = await checkAircraftConflict(resolvedAircraftId, start, end, id);
    if (conflict) { res.status(409).json({ message: conflict }); return; }
  }

  if (resolvedInstructorId && !isCanceling) {
    if (resolvedInstructorId !== existing.instructor_id) {
      const err = await assertInstructor(resolvedInstructorId);
      if (err) { res.status(422).json({ message: err }); return; }
    }
    const reservationConflict = await checkInstructorReservationConflict(resolvedInstructorId, start, end, id);
    if (reservationConflict) { res.status(409).json({ message: reservationConflict }); return; }
    const scheduleConflict = await checkInstructorScheduleConflict(resolvedInstructorId, start, end, id);
    if (scheduleConflict) { res.status(409).json({ message: scheduleConflict }); return; }
  }

  const reservation = await prisma.reservation.update({
    where: { id },
    data: {
      user_id:       user_id       ? Number(user_id)       : undefined,
      aircraft_id:   aircraft_id   !== undefined ? resolvedAircraftId   : undefined,
      instructor_id: instructor_id !== undefined ? resolvedInstructorId : undefined,
      date_start:    start,
      date_end:      end,
      status:        resolvedStatus,
    },
    include: includeRelations,
  });

  // Sync linked InstructorSchedule
  if (isCanceling) {
    await deleteLinkedScheduleEntry(id);
  } else if (resolvedInstructorId) {
    await updateLinkedScheduleEntry(id, resolvedInstructorId, start, end);
  } else if (!resolvedInstructorId && existing.instructor_id) {
    await deleteLinkedScheduleEntry(id);
  }

  // Refetch so the response reflects the updated schedule relation
  const fresh = await prisma.reservation.findUnique({
    where: { id },
    include: includeRelations,
  });
  res.json(fresh);
}

// ── DELETE /api/reservations/:id ──────────────────────────────────────────────
// The Cascade on InstructorSchedule.reservation_id handles automatic cleanup.
export async function deleteReservation(req: Request, res: Response) {
  const id = Number(req.params.id);
  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) { res.status(404).json({ message: 'Reservation not found' }); return; }
  await prisma.reservation.delete({ where: { id } });
  res.status(204).send();
}
