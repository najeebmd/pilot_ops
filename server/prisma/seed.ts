import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

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

async function main() {
  console.log('Seeding users...');
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
  }
  console.log(`Seeded ${users.length} users.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
