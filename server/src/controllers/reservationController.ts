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
  aircraft_schedule:   { select: { id: true } },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (d: Date) =>
  d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
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

/** The user being booked must hold STUDENT or PILOT role. */
async function assertStudentOrPilot(user_id: number): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: user_id },
    include: { roles: { include: { role: true } } },
  });
  if (!user) return 'User not found';
  const allowed = user.roles.some(r => ['STUDENT', 'PILOT', 'INSTRUCTOR'].includes(r.role.name));
  if (!allowed)
    return `${user.first_name} ${user.last_name} must have the Student or Pilot role to make a reservation`;
  return null;
}

/** Reserving an aircraft without an instructor requires the PILOT role. */
async function assertPilotForSoloAircraft(user_id: number): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: user_id },
    include: { roles: { include: { role: true } } },
  });
  if (!user) return 'User not found';
  const hasPilot = user.roles.some((r) => r.role.name === 'PILOT' || r.role.name === 'INSTRUCTOR');
  if (!hasPilot)
    return 'You must have the Pilot role to reserve an aircraft without an instructor';
  return null;
}

// ── Aircraft conflict: check AircraftSchedule ─────────────────────────────────
async function checkAircraftConflict(
  aircraft_id: number, start: Date, end: Date, excludeReservationId?: number,
): Promise<string | null> {
  const conflict = await prisma.aircraftSchedule.findFirst({
    where: {
      aircraft_id,
      // Exclude the schedule entry linked to the reservation being updated
      reservation_id: excludeReservationId ? { not: excludeReservationId } : undefined,
      date_start: { lt: end },
      date_end:   { gt: start },
    },
    include: { aircraft: { select: { tail_number: true } } },
  });
  if (!conflict) return null;
  return (
    `Aircraft conflict: ${conflict.aircraft.tail_number} already has a ` +
    `"${conflict.activity_type}" entry from ${fmt(conflict.date_start)} to ${fmt(conflict.date_end)} ` +
    `(schedule id: ${conflict.id})`
  );
}

// ── Instructor conflict: check existing Reservations + InstructorSchedule ─────
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

async function checkInstructorScheduleConflict(
  instructor_id: number, start: Date, end: Date, excludeReservationId?: number,
): Promise<string | null> {
  const conflict = await prisma.instructorSchedule.findFirst({
    where: {
      instructor_id,
      reservation_id: excludeReservationId ? { not: excludeReservationId } : undefined,
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

// ── AircraftSchedule sync helpers ─────────────────────────────────────────────
async function createLinkedAircraftSchedule(aircraft_id: number, reservation_id: number, start: Date, end: Date) {
  await prisma.aircraftSchedule.create({
    data: { aircraft_id, reservation_id, date_start: start, date_end: end, activity_type: 'RESERVED' },
  });
}

async function updateLinkedAircraftSchedule(reservation_id: number, aircraft_id: number, start: Date, end: Date) {
  const existing = await prisma.aircraftSchedule.findUnique({ where: { reservation_id } });
  if (!existing) {
    await createLinkedAircraftSchedule(aircraft_id, reservation_id, start, end);
  } else {
    await prisma.aircraftSchedule.update({
      where: { reservation_id },
      data:  { aircraft_id, date_start: start, date_end: end },
    });
  }
}

async function deleteLinkedAircraftSchedule(reservation_id: number) {
  await prisma.aircraftSchedule.deleteMany({ where: { reservation_id } });
}

// ── InstructorSchedule sync helpers (unchanged logic, moved here for clarity) ─
async function createLinkedInstructorSchedule(instructor_id: number, reservation_id: number, start: Date, end: Date) {
  await prisma.instructorSchedule.create({
    data: { instructor_id, reservation_id, date_start: start, date_end: end, activity_type: 'INSTRUCTION' },
  });
}

async function updateLinkedInstructorSchedule(reservation_id: number, instructor_id: number, start: Date, end: Date) {
  const existing = await prisma.instructorSchedule.findUnique({ where: { reservation_id } });
  if (!existing) {
    await createLinkedInstructorSchedule(instructor_id, reservation_id, start, end);
  } else {
    await prisma.instructorSchedule.update({
      where: { reservation_id },
      data:  { instructor_id, date_start: start, date_end: end },
    });
  }
}

async function deleteLinkedInstructorSchedule(reservation_id: number) {
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
  const dateFrom = req.query.date_from ? new Date(String(req.query.date_from)) : undefined;
  const dateTo   = req.query.date_to   ? new Date(String(req.query.date_to))   : undefined;
  if (dateFrom) where.date_start = { ...(where.date_start as object ?? {}), lt: dateTo };
  if (dateTo)   where.date_end   = { ...(where.date_end   as object ?? {}), gt: dateFrom };

  // start_from / start_to: filter by date_start range (for list views)
  const startFrom = req.query.start_from ? new Date(String(req.query.start_from)) : undefined;
  const startTo   = req.query.start_to   ? new Date(String(req.query.start_to))   : undefined;
  if (startFrom || startTo) {
    where.date_start = {
      ...(where.date_start as object ?? {}),
      ...(startFrom ? { gte: startFrom } : {}),
      ...(startTo   ? { lte: startTo }   : {}),
    };
  }

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
  const reservation = await prisma.reservation.findUnique({ where: { id }, include: includeRelations });
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

  if (!aircraft_id && !instructor_id) {
    res.status(400).json({ message: 'At least one of aircraft or instructor must be selected' });
    return;
  }

  const start = new Date(date_start);
  const end   = new Date(date_end);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ message: 'date_start and date_end must be valid ISO date-time strings' });
    return;
  }
  if (end <= start) { res.status(400).json({ message: 'date_end must be after date_start' }); return; }
  if (status && !VALID_STATUSES.has(String(status).toUpperCase())) {
    res.status(400).json({ message: `status must be one of: ${[...VALID_STATUSES].join(', ')}` }); return;
  }

  const studentOrPilotErr = await assertStudentOrPilot(Number(user_id));
  if (studentOrPilotErr) { res.status(422).json({ message: studentOrPilotErr }); return; }

  // Aircraft checks via AircraftSchedule
  if (aircraft_id) {
    const aircraftExists = await prisma.aircraft.findUnique({ where: { id: Number(aircraft_id) } });
    if (!aircraftExists) { res.status(404).json({ message: 'Aircraft not found' }); return; }

    const conflict = await checkAircraftConflict(Number(aircraft_id), start, end);
    if (conflict) { res.status(409).json({ message: conflict }); return; }

    // Solo aircraft reservation requires PILOT role
    if (!instructor_id) {
      const pilotErr = await assertPilotForSoloAircraft(Number(user_id));
      if (pilotErr) { res.status(403).json({ message: pilotErr }); return; }
    }
  }

  // Instructor checks
  if (instructor_id) {
    const err = await assertInstructor(Number(instructor_id));
    if (err) { res.status(422).json({ message: err }); return; }

    const resConflict = await checkInstructorReservationConflict(Number(instructor_id), start, end);
    if (resConflict) { res.status(409).json({ message: resConflict }); return; }

    const schedConflict = await checkInstructorScheduleConflict(Number(instructor_id), start, end);
    if (schedConflict) { res.status(409).json({ message: schedConflict }); return; }
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

  // Auto-create linked schedule entries
  if (aircraft_id && reservation.status === 'RESERVED') {
    await createLinkedAircraftSchedule(Number(aircraft_id), reservation.id, start, end);
  }
  if (instructor_id && reservation.status === 'RESERVED') {
    await createLinkedInstructorSchedule(Number(instructor_id), reservation.id, start, end);
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
    res.status(400).json({ message: `status must be one of: ${[...VALID_STATUSES].join(', ')}` }); return;
  }

  const start = date_start ? new Date(date_start) : existing.date_start;
  const end   = date_end   ? new Date(date_end)   : existing.date_end;
  if (end <= start) { res.status(400).json({ message: 'date_end must be after date_start' }); return; }

  const resolvedAircraftId   = aircraft_id   !== undefined ? (aircraft_id   ? Number(aircraft_id)   : null) : existing.aircraft_id;
  const resolvedInstructorId = instructor_id !== undefined ? (instructor_id ? Number(instructor_id) : null) : existing.instructor_id;

  if (!resolvedAircraftId && !resolvedInstructorId) {
    res.status(400).json({ message: 'At least one of aircraft or instructor must be selected' });
    return;
  }

  const resolvedUserId = user_id ? Number(user_id) : existing.user_id;
  const spErr = await assertStudentOrPilot(resolvedUserId);
  if (spErr) { res.status(422).json({ message: spErr }); return; }
  const resolvedStatus       = status ? String(status).toUpperCase() as ReservationStatus : existing.status;
  const isCanceling          = resolvedStatus === 'CANCELED' && existing.status !== 'CANCELED';

  // Aircraft conflict check (via AircraftSchedule, exclude own entry)
  if (resolvedAircraftId && !isCanceling) {
    const conflict = await checkAircraftConflict(resolvedAircraftId, start, end, id);
    if (conflict) { res.status(409).json({ message: conflict }); return; }

    // Solo aircraft reservation requires PILOT role
    if (!resolvedInstructorId) {
      const pilotErr = await assertPilotForSoloAircraft(resolvedUserId);
      if (pilotErr) { res.status(403).json({ message: pilotErr }); return; }
    }
  }

  // Instructor conflict checks
  if (resolvedInstructorId && !isCanceling) {
    if (resolvedInstructorId !== existing.instructor_id) {
      const err = await assertInstructor(resolvedInstructorId);
      if (err) { res.status(422).json({ message: err }); return; }
    }
    const resConflict = await checkInstructorReservationConflict(resolvedInstructorId, start, end, id);
    if (resConflict) { res.status(409).json({ message: resConflict }); return; }

    const schedConflict = await checkInstructorScheduleConflict(resolvedInstructorId, start, end, id);
    if (schedConflict) { res.status(409).json({ message: schedConflict }); return; }
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

  // Sync AircraftSchedule
  if (isCanceling) {
    await deleteLinkedAircraftSchedule(id);
    await deleteLinkedInstructorSchedule(id);
  } else {
    if (resolvedAircraftId) {
      await updateLinkedAircraftSchedule(id, resolvedAircraftId, start, end);
    } else if (!resolvedAircraftId && existing.aircraft_id) {
      await deleteLinkedAircraftSchedule(id);
    }

    if (resolvedInstructorId) {
      await updateLinkedInstructorSchedule(id, resolvedInstructorId, start, end);
    } else if (!resolvedInstructorId && existing.instructor_id) {
      await deleteLinkedInstructorSchedule(id);
    }
  }

  // Refetch so response reflects updated schedule relations
  const fresh = await prisma.reservation.findUnique({ where: { id }, include: includeRelations });
  res.json(fresh);
}

// ── DELETE /api/reservations/:id ──────────────────────────────────────────────
// CASCADE on reservation_id in both AircraftSchedule and InstructorSchedule
// automatically cleans up linked entries.
export async function deleteReservation(req: Request, res: Response) {
  const id = Number(req.params.id);
  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) { res.status(404).json({ message: 'Reservation not found' }); return; }
  await prisma.reservation.delete({ where: { id } });
  res.status(204).send();
}
