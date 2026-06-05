import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import bcrypt from 'bcrypt';

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

const instructors = [
  {
    first_name: 'Robert',   last_name: 'Hayes',
    email: 'robert.hayes@pilotops.com',    phone: '+1-303-555-0111',
    date_of_birth: new Date('1974-05-20'),
    address_line1: '820 Pilot Way', city: 'Denver', state: 'CO', country: 'US', postal_code: '80202',
  },
  {
    first_name: 'Linda',    last_name: 'Kowalski',
    email: 'linda.kowalski@pilotops.com',  phone: '+1-602-555-0122',
    date_of_birth: new Date('1980-09-14'),
    address_line1: '45 Runway Blvd', city: 'Phoenix', state: 'AZ', country: 'US', postal_code: '85001',
  },
  {
    first_name: 'Ahmed',    last_name: 'Al-Rashid',
    email: 'ahmed.alrashid@pilotops.com',  phone: '+971-50-555-0133',
    date_of_birth: new Date('1977-03-02'),
    address_line1: 'Al Maktoum Airport Rd', city: 'Dubai', state: 'Dubai', country: 'AE', postal_code: '00000',
  },
  {
    first_name: 'Sophie',   last_name: 'Laurent',
    email: 'sophie.laurent@pilotops.com',  phone: '+33-1-555-0144',
    date_of_birth: new Date('1983-11-28'),
    address_line1: '12 Rue de l\'Aviation', city: 'Paris', state: 'Île-de-France', country: 'FR', postal_code: '75001',
  },
  {
    first_name: 'Connor',   last_name: 'O\'Brien',
    email: 'connor.obrien@pilotops.com',   phone: '+353-1-555-0155',
    date_of_birth: new Date('1979-07-07'),
    address_line1: '3 Flight Academy Rd', city: 'Dublin', state: 'Leinster', country: 'IE', postal_code: 'D01',
  },
  {
    first_name: 'Yuki',     last_name: 'Tanaka',
    email: 'yuki.tanaka@pilotops.com',     phone: '+81-3-555-0166',
    date_of_birth: new Date('1985-01-19'),
    address_line1: '7-2 Haneda Approach', city: 'Tokyo', state: 'Tokyo', country: 'JP', postal_code: '144-0041',
  },
  {
    first_name: 'Grace',    last_name: 'Adeyemi',
    email: 'grace.adeyemi@pilotops.com',   phone: '+234-1-555-0177',
    date_of_birth: new Date('1981-06-30'),
    address_line1: 'Lagos Aviation Hub', city: 'Lagos', state: 'Lagos', country: 'NG', postal_code: '100001',
  },
  {
    first_name: 'Michael',  last_name: 'Fernandez',
    email: 'michael.fernandez@pilotops.com', phone: '+34-91-555-0188',
    date_of_birth: new Date('1976-10-11'),
    address_line1: 'Calle Aeronáutica 5', city: 'Madrid', state: 'Community of Madrid', country: 'ES', postal_code: '28001',
  },
  {
    first_name: 'Ingrid',   last_name: 'Lindqvist',
    email: 'ingrid.lindqvist@pilotops.com', phone: '+46-8-555-0199',
    date_of_birth: new Date('1982-04-25'),
    address_line1: 'Arlanda Flight Path 9', city: 'Stockholm', state: 'Stockholm', country: 'SE', postal_code: '10120',
  },
  {
    first_name: 'Daniel',   last_name: 'Osei',
    email: 'daniel.osei@pilotops.com',     phone: '+61-2-555-0200',
    date_of_birth: new Date('1978-08-16'),
    address_line1: '22 Aviator St', city: 'Sydney', state: 'NSW', country: 'AU', postal_code: '2000',
  },
];

async function main() {
  const instructorRole = await prisma.role.findUnique({ where: { name: 'INSTRUCTOR' } });
  if (!instructorRole) throw new Error('INSTRUCTOR role not found — run the main seed first');

  console.log('Adding 10 instructor users…');

  for (const data of instructors) {
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: data,
    });

    const username = data.email.split('@')[0].replace(/[^a-z0-9]/gi, '_');
    const password = await bcrypt.hash('Password1!', 10);

    await prisma.userLogin.upsert({
      where: { user_id: user.id },
      update: {},
      create: { user_id: user.id, username, password },
    });

    await prisma.userRole.upsert({
      where: { user_id_role_id: { user_id: user.id, role_id: instructorRole.id } },
      update: {},
      create: { user_id: user.id, role_id: instructorRole.id },
    });

    console.log(`  ✓ ${user.first_name} ${user.last_name} (${username})`);
  }

  console.log('Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
