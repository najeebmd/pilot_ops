import { PrismaClient, RoleName, AircraftStatus } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import bcrypt from 'bcrypt';

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

const users = [
  {
    first_name: 'James', last_name: 'Mitchell',
    email: 'james.mitchell@example.com', phone: '+1-202-555-0101',
    date_of_birth: new Date('1985-03-14'),
    address_line1: '142 Elm Street', city: 'Washington', state: 'DC', country: 'US', postal_code: '20001',
  },
  {
    first_name: 'Sarah', last_name: 'Chen',
    email: 'sarah.chen@example.com', phone: '+1-415-555-0188',
    date_of_birth: new Date('1990-07-22'),
    address_line1: '88 Market St', address_line2: 'Apt 4B', city: 'San Francisco', state: 'CA', country: 'US', postal_code: '94105',
  },
  {
    first_name: 'Marcus', last_name: 'Rivera',
    email: 'marcus.rivera@example.com', phone: '+1-312-555-0143',
    date_of_birth: new Date('1978-11-05'),
    address_line1: '500 N Michigan Ave', city: 'Chicago', state: 'IL', country: 'US', postal_code: '60611',
  },
  {
    first_name: 'Emily', last_name: 'Thornton',
    email: 'emily.thornton@example.com', phone: '+1-646-555-0172',
    date_of_birth: new Date('1993-01-30'),
    address_line1: '310 W 42nd St', address_line2: 'Suite 12', city: 'New York', state: 'NY', country: 'US', postal_code: '10036',
  },
  {
    first_name: 'David', last_name: 'Okafor',
    email: 'david.okafor@example.com', phone: '+1-713-555-0159',
    date_of_birth: new Date('1982-06-18'),
    address_line1: '7200 Main St', city: 'Houston', state: 'TX', country: 'US', postal_code: '77030',
  },
  {
    first_name: 'Priya', last_name: 'Nair',
    email: 'priya.nair@example.com', phone: '+1-206-555-0134',
    date_of_birth: new Date('1995-09-09'),
    address_line1: '1420 5th Ave', city: 'Seattle', state: 'WA', country: 'US', postal_code: '98101',
  },
  {
    first_name: 'Thomas', last_name: 'Bergmann',
    email: 'thomas.bergmann@example.com', phone: '+49-30-555-0167',
    date_of_birth: new Date('1975-04-27'),
    address_line1: 'Unter den Linden 12', city: 'Berlin', state: 'Berlin', country: 'DE', postal_code: '10117',
  },
  {
    first_name: 'Aisha', last_name: 'Al-Farsi',
    email: 'aisha.alfarsi@example.com', phone: '+971-4-555-0121',
    date_of_birth: new Date('1988-12-03'),
    address_line1: 'Sheikh Zayed Rd', address_line2: 'Floor 18', city: 'Dubai', state: 'Dubai', country: 'AE', postal_code: '00000',
  },
  {
    first_name: 'Carlos', last_name: 'Mendoza',
    email: 'carlos.mendoza@example.com', phone: '+52-55-555-0198',
    date_of_birth: new Date('1991-08-15'),
    address_line1: 'Av. Insurgentes Sur 1602', city: 'Mexico City', state: 'CDMX', country: 'MX', postal_code: '03940',
  },
  {
    first_name: 'Natasha', last_name: 'Volkov',
    email: 'natasha.volkov@example.com', phone: '+7-495-555-0145',
    date_of_birth: new Date('1987-02-11'),
    address_line1: 'Tverskaya St 15', city: 'Moscow', state: 'Moscow', country: 'RU', postal_code: '125009',
  },
];

const roleNames: RoleName[] = ['STUDENT', 'GUEST', 'INSTRUCTOR', 'STAFF', 'ADMIN', 'OTHER'];

// user index → role to assign
const userRoleMap: Record<number, RoleName> = {
  0: 'STUDENT',
  1: 'STUDENT',
  2: 'STUDENT',
  3: 'STUDENT',
  4: 'STUDENT',
  5: 'INSTRUCTOR',
  6: 'INSTRUCTOR',
  7: 'STAFF',
  8: 'ADMIN',
  9: 'STUDENT',
};

async function main() {
  // Roles
  console.log('Seeding roles...');
  for (const name of roleNames) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`Seeded ${roleNames.length} roles.`);

  // Users
  console.log('Seeding users...');
  const seededUsers = [];
  for (const user of users) {
    const u = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
    seededUsers.push(u);
  }
  console.log(`Seeded ${seededUsers.length} users.`);

  // UserLogins
  console.log('Seeding user logins...');
  for (const user of seededUsers) {
    const username = user.email.split('@')[0].replace(/\./g, '_');
    const password = await bcrypt.hash('Password1!', 10);
    await prisma.userLogin.upsert({
      where: { user_id: user.id },
      update: {},
      create: { user_id: user.id, username, password },
    });
  }
  console.log(`Seeded ${seededUsers.length} user logins.`);

  // UserRoles
  console.log('Seeding user roles...');
  for (let i = 0; i < seededUsers.length; i++) {
    const user = seededUsers[i];
    const roleName = userRoleMap[i] ?? 'STUDENT';
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) continue;
    await prisma.userRole.upsert({
      where: { user_id_role_id: { user_id: user.id, role_id: role.id } },
      update: {},
      create: { user_id: user.id, role_id: role.id },
    });
  }
  console.log(`Seeded ${seededUsers.length} user roles.`);

  // Aircraft
  console.log('Seeding aircraft...');
  const aircraft: {
    tail_number: string; serial_number: string; make: string; model: string;
    year_built: number; flight_hours: number; fuel_capacity: number; weight: number;
    status: AircraftStatus; rental_rate: number; next_inspection_date: Date;
  }[] = [
    { tail_number: 'N1234A', serial_number: '17281234', make: 'Cessna',    model: '172S Skyhawk',   year_built: 2018, flight_hours: 1240.5, fuel_capacity: 56,  weight: 2550, status: 'READY',         rental_rate: 165, next_inspection_date: new Date('2026-09-15') },
    { tail_number: 'N5678B', serial_number: '17285678', make: 'Cessna',    model: '172S Skyhawk',   year_built: 2019, flight_hours: 890.0,  fuel_capacity: 56,  weight: 2550, status: 'READY',         rental_rate: 165, next_inspection_date: new Date('2026-11-20') },
    { tail_number: 'N9012C', serial_number: '28249012', make: 'Piper',     model: 'PA-28 Cherokee', year_built: 2016, flight_hours: 2100.3, fuel_capacity: 50,  weight: 2440, status: 'MAINTENANCE',    rental_rate: 155, next_inspection_date: new Date('2026-07-01') },
    { tail_number: 'N3456D', serial_number: 'DA4223456', make: 'Diamond',  model: 'DA40-NG',        year_built: 2020, flight_hours: 520.8,  fuel_capacity: 42,  weight: 2535, status: 'READY',         rental_rate: 185, next_inspection_date: new Date('2027-01-10') },
    { tail_number: 'N7890E', serial_number: 'DA4227890', make: 'Diamond',  model: 'DA40-NG',        year_built: 2021, flight_hours: 310.2,  fuel_capacity: 42,  weight: 2535, status: 'READY',         rental_rate: 185, next_inspection_date: new Date('2027-03-22') },
    { tail_number: 'N2345F', serial_number: 'BE762345',  make: 'Beechcraft',model: 'G36 Bonanza',   year_built: 2017, flight_hours: 1780.6, fuel_capacity: 74,  weight: 3650, status: 'READY',         rental_rate: 240, next_inspection_date: new Date('2026-08-05') },
    { tail_number: 'N6789G', serial_number: 'PA446789',  make: 'Piper',    model: 'PA-44 Seminole', year_built: 2015, flight_hours: 3200.0, fuel_capacity: 110, weight: 3800, status: 'READY',         rental_rate: 320, next_inspection_date: new Date('2026-10-30') },
    { tail_number: 'N0123H', serial_number: 'CE5200123', make: 'Cessna',   model: '172R Skyhawk',   year_built: 2013, flight_hours: 4580.1, fuel_capacity: 56,  weight: 2550, status: 'NOT_AVAILABLE', rental_rate: 145, next_inspection_date: new Date('2026-06-15') },
    { tail_number: 'N4567I', serial_number: 'DA4224567', make: 'Diamond',  model: 'DA20-C1',        year_built: 2022, flight_hours: 125.4,  fuel_capacity: 24,  weight: 1764, status: 'READY',         rental_rate: 130, next_inspection_date: new Date('2027-06-01') },
    { tail_number: 'N8901J', serial_number: 'BE588901',  make: 'Beechcraft',model: 'C172 Musketeer', year_built: 2014, flight_hours: 2890.7, fuel_capacity: 60,  weight: 2750, status: 'MAINTENANCE',   rental_rate: 150, next_inspection_date: new Date('2026-07-20') },
  ];

  for (const a of aircraft) {
    await prisma.aircraft.upsert({
      where:  { tail_number: a.tail_number },
      update: {},
      create: a,
    });
  }
  console.log(`Seeded ${aircraft.length} aircraft.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
