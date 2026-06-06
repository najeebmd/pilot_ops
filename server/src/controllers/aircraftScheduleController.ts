import { Request, Response } from 'express';
import { AircraftActivityType } from '@prisma/client';
import prisma from '../lib/prisma';

const VALID_TYPES   = new Set<string>(['MAINTENANCE', 'NOT_AVAILABLE', 'RESERVED', 'OTHER']);
const SORTABLE      = new Set(['date_start', 'date_end', 'activity_type', 'date_created']);

const includeAircraft = {
  aircraft: { select: { id: true, tail_number: true, make: true, model: true } },
} as const;

const fmt = (d: Date) =>
  d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });

async function checkConflict(
  aircraft_id: number, start: Date, end: Date, excludeId?: number,
): Promise<string | null> {
  const conflict = await prisma.aircraftSchedule.findFirst({
    where: {
      aircraft_id,
      id:         excludeId ? { not: excludeId } : undefined,
      date_start: { lt: end },
      date_end:   { gt: start },
    },
    include: { aircraft: { select: { tail_number: true } } },
  });
  if (!conflict) return null;
  return (
    `Schedule conflict: ${conflict.aircraft.tail_number} already has a ` +
    `"${conflict.activity_type}" entry from ${fmt(conflict.date_start)} to ` +
    `${fmt(conflict.date_end)} (id: ${conflict.id})`
  );
}

// ── GET /api/aircraft-schedule ────────────────────────────────────────────────
export async function getAircraftSchedules(req: Request, res: Response) {
  const page      = Math.max(1, Number(req.query.page)     || 1);
  const pageSize  = Math.min(100, Math.max(1, Number(req.query.pageSize) || 10));
  const sortBy    = SORTABLE.has(String(req.query.sortBy)) ? String(req.query.sortBy) : 'date_start';
  const sortOrder: 'asc' | 'desc' = req.query.sortOrder === 'desc' ? 'desc' : 'asc';

  const aircraftId = req.query.aircraft_id ? Number(req.query.aircraft_id) : undefined;
  const dateFrom   = req.query.date_from   ? new Date(String(req.query.date_from)) : undefined;
  const dateTo     = req.query.date_to     ? new Date(String(req.query.date_to))   : undefined;

  const where: Record<string, unknown> = {};
  if (aircraftId) where.aircraft_id = aircraftId;
  if (dateFrom || dateTo) {
    if (dateTo)   where.date_start = { lt: dateTo };
    if (dateFrom) where.date_end   = { gt: dateFrom };
  }

  const [schedules, total] = await Promise.all([
    prisma.aircraftSchedule.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: includeAircraft,
    }),
    prisma.aircraftSchedule.count({ where }),
  ]);
  res.json({ data: schedules, total, page, pageSize });
}

// ── GET /api/aircraft-schedule/:id ───────────────────────────────────────────
export async function getAircraftScheduleById(req: Request, res: Response) {
  const id = Number(req.params.id);
  const entry = await prisma.aircraftSchedule.findUnique({ where: { id }, include: includeAircraft });
  if (!entry) { res.status(404).json({ message: 'Schedule entry not found' }); return; }
  res.json(entry);
}

// ── POST /api/aircraft-schedule ───────────────────────────────────────────────
export async function createAircraftSchedule(req: Request, res: Response) {
  const { aircraft_id, date_start, date_end, activity_type } = req.body;

  if (!aircraft_id || !date_start || !date_end || !activity_type) {
    res.status(400).json({ message: 'aircraft_id, date_start, date_end and activity_type are required' });
    return;
  }
  if (!VALID_TYPES.has(String(activity_type).toUpperCase())) {
    res.status(400).json({ message: `activity_type must be one of: ${[...VALID_TYPES].join(', ')}` });
    return;
  }

  const start = new Date(date_start);
  const end   = new Date(date_end);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ message: 'date_start and date_end must be valid ISO date-time strings' });
    return;
  }
  if (end <= start) { res.status(400).json({ message: 'date_end must be after date_start' }); return; }

  const aircraftExists = await prisma.aircraft.findUnique({ where: { id: Number(aircraft_id) } });
  if (!aircraftExists) { res.status(404).json({ message: 'Aircraft not found' }); return; }

  const conflict = await checkConflict(Number(aircraft_id), start, end);
  if (conflict) { res.status(409).json({ message: conflict }); return; }

  const entry = await prisma.aircraftSchedule.create({
    data: {
      aircraft_id:   Number(aircraft_id),
      date_start:    start,
      date_end:      end,
      activity_type: activity_type.toUpperCase() as AircraftActivityType,
    },
    include: includeAircraft,
  });
  res.status(201).json(entry);
}

// ── PUT /api/aircraft-schedule/:id ────────────────────────────────────────────
export async function updateAircraftSchedule(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { aircraft_id, date_start, date_end, activity_type } = req.body;

  const existing = await prisma.aircraftSchedule.findUnique({ where: { id } });
  if (!existing) { res.status(404).json({ message: 'Schedule entry not found' }); return; }

  if (existing.reservation_id) {
    res.status(400).json({ message: 'This entry was auto-created from a reservation. Edit the reservation instead.' });
    return;
  }

  if (activity_type && !VALID_TYPES.has(String(activity_type).toUpperCase())) {
    res.status(400).json({ message: `activity_type must be one of: ${[...VALID_TYPES].join(', ')}` });
    return;
  }

  const start = date_start ? new Date(date_start) : existing.date_start;
  const end   = date_end   ? new Date(date_end)   : existing.date_end;
  if (end <= start) { res.status(400).json({ message: 'date_end must be after date_start' }); return; }

  const conflict = await checkConflict(existing.aircraft_id, start, end, id);
  if (conflict) { res.status(409).json({ message: conflict }); return; }

  const entry = await prisma.aircraftSchedule.update({
    where: { id },
    data: {
      aircraft_id:   aircraft_id ? Number(aircraft_id) : undefined,
      date_start:    start,
      date_end:      end,
      activity_type: activity_type ? activity_type.toUpperCase() as AircraftActivityType : undefined,
    },
    include: includeAircraft,
  });
  res.json(entry);
}

// ── DELETE /api/aircraft-schedule/:id ────────────────────────────────────────
export async function deleteAircraftSchedule(req: Request, res: Response) {
  const id = Number(req.params.id);
  const existing = await prisma.aircraftSchedule.findUnique({ where: { id } });
  if (!existing) { res.status(404).json({ message: 'Schedule entry not found' }); return; }
  if (existing.reservation_id) {
    res.status(400).json({ message: 'This entry is linked to a reservation. Cancel the reservation instead.' });
    return;
  }
  await prisma.aircraftSchedule.delete({ where: { id } });
  res.status(204).send();
}
