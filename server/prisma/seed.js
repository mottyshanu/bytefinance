const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create Admin
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: 'adminpassword', // In production, hash this
      role: 'ADMIN',
      name: 'Admin User'
    },
  });

  // Create Partner
  const partner = await prisma.user.upsert({
    where: { username: 'partner' },
    update: {},
    create: {
      username: 'partner',
      password: 'partnerpassword',
      role: 'PARTNER',
      name: 'Partner User'
    },
  });

  // Create Accounts
  const mainAccount = await prisma.account.upsert({
    where: { name: 'Main' },
    update: {},
    create: { name: 'Main', balance: 0 }
  });

  const retainAccount = await prisma.account.upsert({
    where: { name: 'Retain' },
    update: {},
    create: { name: 'Retain', balance: 0 }
  });

  // Seed some data
  /* Deprecated
  await prisma.retainFund.create({
    data: {
      amount: 5000,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear()
    }
  });
  */

  /*
  await prisma.transaction.create({
    data: {
      date: new Date(),
      type: 'EXPENSE',
      amount: 150,
      description: 'Office Supplies',
      category: 'office',
      accountId: mainAccount.id
    }
  });
  */

  console.log({ admin, partner, mainAccount, retainAccount });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
