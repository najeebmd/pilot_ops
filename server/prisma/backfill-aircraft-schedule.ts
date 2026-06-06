/**
 * One-time backfill: create AircraftSchedule entries for any RESERVED/COMPLETED
 * reservations that have an aircraft_id but no linked AircraftSchedule entry.
 *
 * Run with:  npx ts-node --transpile-only prisma/backfill-aircraft-schedule.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? 'file:./dev.db' });
const prisma  = new PrismaClient({ adapter });

async function main() {
  const reservations = await prisma.reservation.findMany({
    where: {
      aircraft_id:      { not: null },
      status:           { in: ['RESERVED', 'COMPLETED'] },
      aircraft_schedule: null,
    },
  });

  console.log(`Backfilling ${reservations.length} reservation(s)…`);

  for (const r of reservations) {
    await prisma.aircraftSchedule.create({
      data: {
        aircraft_id:    r.aircraft_id!,
        reservation_id: r.id,
        date_start:     r.date_start,
        date_end:       r.date_end,
        activity_type:  'RESERVED',
      },
    });
    console.log(`  ✔ Reservation ${r.id} → AircraftSchedule created (aircraft ${r.aircraft_id})`);
  }

  console.log('Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
