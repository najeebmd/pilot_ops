import { Request, Response } from 'express';
import { AircraftStatus } from '@prisma/client';
import prisma from '../lib/prisma';

const VALID_STATUSES = new Set<string>(['READY', 'MAINTENANCE', 'NOT_AVAILABLE']);
const SORTABLE = new Set([
  'tail_number', 'serial_number', 'make', 'model', 'year_built',
  'flight_hours', 'status', 'rental_rate', 'next_inspection_date', 'date_created', 'date_updated',
]);

// ── GET /api/aircraft ─────────────────────────────────────────────────────────
export async function getAircraft(req: Request, res: Response) {
  const page      = Math.max(1, Number(req.query.page)     || 1);
  const pageSize  = Math.min(100, Math.max(1, Number(req.query.pageSize) || 10));
  const sortBy    = SORTABLE.has(String(req.query.sortBy)) ? String(req.query.sortBy) : 'date_created';
  const sortOrder: 'asc' | 'desc' = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

  // Optional status filter
  const statusFilter = req.query.status && VALID_STATUSES.has(String(req.query.status).toUpperCase())
    ? String(req.query.status).toUpperCase() as AircraftStatus
    : undefined;

  const where = statusFilter ? { status: statusFilter } : {};

  const [aircraft, total] = await Promise.all([
    prisma.aircraft.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.aircraft.count({ where }),
  ]);

  res.json({ data: aircraft, total, page, pageSize });
}

// ── GET /api/aircraft/:id ─────────────────────────────────────────────────────
export async function getAircraftById(req: Request, res: Response) {
  const id = Number(req.params.id);
  const aircraft = await prisma.aircraft.findUnique({ where: { id } });
  if (!aircraft) {
    res.status(404).json({ message: 'Aircraft not found' });
    return;
  }
  res.json(aircraft);
}

// ── POST /api/aircraft ────────────────────────────────────────────────────────
export async function createAircraft(req: Request, res: Response) {
  const {
    tail_number, serial_number, make, model, year_built,
    flight_hours, fuel_capacity, weight, status,
    rental_rate, next_inspection_date,
  } = req.body;

  if (!tail_number || !serial_number || !make || !model || !year_built) {
    res.status(400).json({ message: 'tail_number, serial_number, make, model and year_built are required' });
    return;
  }

  if (status && !VALID_STATUSES.has(String(status).toUpperCase())) {
    res.status(400).json({ message: `status must be one of: ${[...VALID_STATUSES].join(', ')}` });
    return;
  }

  const aircraft = await prisma.aircraft.create({
    data: {
      tail_number:          String(tail_number).toUpperCase(),
      serial_number:        String(serial_number),
      make:                 String(make),
      model:                String(model),
      year_built:           Number(year_built),
      flight_hours:         flight_hours         != null ? Number(flight_hours)  : 0,
      fuel_capacity:        fuel_capacity         != null ? Number(fuel_capacity) : undefined,
      weight:               weight               != null ? Number(weight)        : undefined,
      status:               status ? String(status).toUpperCase() as AircraftStatus : 'READY',
      rental_rate:          rental_rate           != null ? Number(rental_rate)   : undefined,
      next_inspection_date: next_inspection_date  ? new Date(next_inspection_date) : undefined,
    },
  });
  res.status(201).json(aircraft);
}

// ── PUT /api/aircraft/:id ─────────────────────────────────────────────────────
export async function updateAircraft(req: Request, res: Response) {
  const id = Number(req.params.id);
  const {
    tail_number, serial_number, make, model, year_built,
    flight_hours, fuel_capacity, weight, status,
    rental_rate, next_inspection_date,
  } = req.body;

  const existing = await prisma.aircraft.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: 'Aircraft not found' });
    return;
  }

  if (status && !VALID_STATUSES.has(String(status).toUpperCase())) {
    res.status(400).json({ message: `status must be one of: ${[...VALID_STATUSES].join(', ')}` });
    return;
  }

  const aircraft = await prisma.aircraft.update({
    where: { id },
    data: {
      tail_number:          tail_number          ? String(tail_number).toUpperCase()            : undefined,
      serial_number:        serial_number        ? String(serial_number)                        : undefined,
      make:                 make                 ? String(make)                                 : undefined,
      model:                model                ? String(model)                                : undefined,
      year_built:           year_built           != null ? Number(year_built)                  : undefined,
      flight_hours:         flight_hours         != null ? Number(flight_hours)                : undefined,
      fuel_capacity:        fuel_capacity        != null ? Number(fuel_capacity)               : undefined,
      weight:               weight               != null ? Number(weight)                      : undefined,
      status:               status               ? String(status).toUpperCase() as AircraftStatus : undefined,
      rental_rate:          rental_rate          != null ? Number(rental_rate)                 : undefined,
      next_inspection_date: next_inspection_date ? new Date(next_inspection_date)              : undefined,
    },
  });
  res.json(aircraft);
}

// ── DELETE /api/aircraft/:id ──────────────────────────────────────────────────
export async function deleteAircraft(req: Request, res: Response) {
  const id = Number(req.params.id);
  const existing = await prisma.aircraft.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: 'Aircraft not found' });
    return;
  }
  await prisma.aircraft.delete({ where: { id } });
  res.status(204).send();
}
