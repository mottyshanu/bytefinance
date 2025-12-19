const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from React build (for production)
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Accounts if not exist
const initAccounts = async () => {
  try {
    const accounts = ['Main', 'Retain'];
    for (const name of accounts) {
      const acc = await prisma.account.findUnique({ where: { name } });
      if (!acc) {
        await prisma.account.create({ data: { name } });
        console.log(`Created account: ${name}`);
      }
    }
  } catch (error) {
    console.error('Error initializing accounts:', error);
  }
};
initAccounts();

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (user && user.password === password) { // In production, use bcrypt
      res.json({ id: user.id, username: user.username, role: user.role, name: user.name });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Admin: Add Transaction
app.post('/api/transaction', async (req, res) => {
  const { date, type, amount, description, category, accountId, clientId, isPending } = req.body;
  try {
    const transaction = await prisma.transaction.create({
      data: {
        date: new Date(date),
        type,
        amount: parseFloat(amount),
        description,
        category,
        accountId: accountId ? parseInt(accountId) : null,
        clientId: clientId ? parseInt(clientId) : null,
        isPending: isPending || false
      }
    });

    // Update Account Balance if not pending
    if (!isPending && accountId) {
      const account = await prisma.account.findUnique({ where: { id: parseInt(accountId) } });
      if (account) {
        const newBalance = type === 'INCOME' 
          ? account.balance + parseFloat(amount) 
          : account.balance - parseFloat(amount);
        await prisma.account.update({
          where: { id: parseInt(accountId) },
          data: { balance: newBalance }
        });
      }
    }

    res.json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

// Update Transaction (e.g. mark as paid)
app.put('/api/transaction/:id', async (req, res) => {
  const { id } = req.params;
  const { isPending } = req.body;
  try {
    const transaction = await prisma.transaction.update({
      where: { id: parseInt(id) },
      data: { isPending }
    });
    
    // If marked as paid (not pending), update balance
    if (isPending === false && transaction.accountId) {
      const account = await prisma.account.findUnique({ where: { id: transaction.accountId } });
      if (account) {
        const newBalance = transaction.type === 'INCOME' 
          ? account.balance + transaction.amount 
          : account.balance - transaction.amount;
        await prisma.account.update({
          where: { id: transaction.accountId },
          data: { balance: newBalance }
        });
      }
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// Get Transactions
app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: { account: true, client: true },
      orderBy: { date: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Accounts
app.get('/api/accounts', async (req, res) => {
  try {
    const accounts = await prisma.account.findMany();
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Clients
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await prisma.client.findMany();
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// Partners
app.get('/api/partners', async (req, res) => {
  try {
    const partners = await prisma.user.findMany({ where: { role: 'PARTNER' } });
    res.json(partners);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch partners' });
  }
});

app.post('/api/partners', async (req, res) => {
  const { name } = req.body;
  try {
    // Generate a simple username from the name
    const username = name.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000);
    const partner = await prisma.user.create({
      data: {
        name,
        username,
        password: 'partner123', // Default password
        role: 'PARTNER'
      }
    });
    res.json(partner);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create partner' });
  }
});

app.post('/api/clients', async (req, res) => {
  const { name } = req.body;
  try {
    const client = await prisma.client.create({ data: { name } });
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// Add Partner Drawing
app.post('/api/drawing', async (req, res) => {
  const { partnerId, amount, date, accountId } = req.body;
  try {
    const drawing = await prisma.partnerDrawing.create({
      data: {
        partnerId: parseInt(partnerId),
        amount: parseFloat(amount),
        date: new Date(date),
        accountId: parseInt(accountId)
      }
    });

    // Deduct from Account
    if (accountId) {
      const account = await prisma.account.findUnique({ where: { id: parseInt(accountId) } });
      if (account) {
        await prisma.account.update({
          where: { id: parseInt(accountId) },
          data: { balance: account.balance - parseFloat(amount) }
        });
      }
    }

    res.json(drawing);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add drawing' });
  }
});

// Get All Drawings
app.get('/api/drawings', async (req, res) => {
  try {
    const drawings = await prisma.partnerDrawing.findMany({
      include: { partner: true, account: true },
      orderBy: { date: 'desc' }
    });
    res.json(drawings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch drawings' });
  }
});

// Categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/categories', async (req, res) => {
  const { name, type, icon } = req.body;
  try {
    const category = await prisma.category.create({
      data: { name, type, icon }
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update Drawing (Mark as Repaid)
app.put('/api/drawing/:id', async (req, res) => {
  const { id } = req.params;
  const { isRepaid } = req.body;
  try {
    const drawing = await prisma.partnerDrawing.findUnique({ where: { id: parseInt(id) } });
    if (!drawing) return res.status(404).json({ error: 'Drawing not found' });

    // If marking as repaid, add money back to account
    if (isRepaid && !drawing.isRepaid && drawing.accountId) {
      const account = await prisma.account.findUnique({ where: { id: drawing.accountId } });
      if (account) {
        await prisma.account.update({
          where: { id: drawing.accountId },
          data: { balance: account.balance + drawing.amount }
        });
      }
    }
    
    // If marking as NOT repaid (undoing), deduct money again
    if (!isRepaid && drawing.isRepaid && drawing.accountId) {
      const account = await prisma.account.findUnique({ where: { id: drawing.accountId } });
      if (account) {
        await prisma.account.update({
          where: { id: drawing.accountId },
          data: { balance: account.balance - drawing.amount }
        });
      }
    }

    const updatedDrawing = await prisma.partnerDrawing.update({
      where: { id: parseInt(id) },
      data: { isRepaid }
    });

    res.json(updatedDrawing);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update drawing' });
  }
});

// Partner: Dashboard Data
app.get('/api/dashboard/partner/:id', async (req, res) => {
  const { id } = req.params;
  const partnerId = parseInt(id);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  try {
    // This month's expenses
    const expenses = await prisma.transaction.findMany({
      where: {
        type: 'EXPENSE',
        date: { gte: startOfMonth, lte: endOfMonth }
      }
    });

    // Partner Drawings
    const drawings = await prisma.partnerDrawing.findMany({
      where: { partnerId },
      orderBy: { date: 'desc' }
    });

    // Partner Salary
    const salary = await prisma.partnerSalary.findFirst({
      where: { partnerId, month: now.getMonth() + 1, year: now.getFullYear() }
    });

    // Pending Amount from Clients (Transactions where isPending = true)
    const pendingClients = await prisma.transaction.findMany({
      where: { isPending: true, type: 'INCOME' },
      include: { client: true }
    });

    // Freelancer Payments
    const freelancerPayments = await prisma.freelancerPayment.findMany({
      where: { date: { gte: startOfMonth, lte: endOfMonth } }
    });

    // Retain Fund (Account named 'Retain')
    const retainFund = await prisma.account.findUnique({
      where: { name: 'Retain' }
    });

    // Main Account
    const mainAccount = await prisma.account.findUnique({
      where: { name: 'Main' }
    });

    res.json({
      expenses,
      drawings,
      salary,
      pendingClients,
      freelancerPayments,
      retainFund,
      mainAccount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Serve React App for all non-API routes (for production)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;


