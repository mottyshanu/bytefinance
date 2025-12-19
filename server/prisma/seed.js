const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  // Delete in order to avoid foreign key constraints
  await prisma.transaction.deleteMany({});
  await prisma.partnerDrawing.deleteMany({});
  await prisma.partnerSalary.deleteMany({});
  await prisma.freelancerPayment.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding users...');
  
  // Create Admin
  await prisma.user.create({
    data: {
      username: 'hafeel11',
      password: 'Hafeel@2913', // In production, hash this
      role: 'ADMIN',
      name: 'Hafeel'
    },
  });

  // Create Partner
  await prisma.user.create({
    data: {
      username: 'Byte11',
      password: 'Byte@111',
      role: 'PARTNER',
      name: 'Byte Partner'
    },
  });

  console.log('Seeding accounts...');
  // Create Accounts
  await prisma.account.create({ data: { name: 'Main', balance: 0 } });
  await prisma.account.create({ data: { name: 'Retain', balance: 0 } });

  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
