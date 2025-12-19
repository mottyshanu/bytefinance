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

// Debug Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve static files from React build (for production)
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Accounts if not exist
// const initAccounts = async () => {
//   try {
//     const accounts = ['Main', 'Retain'];
//     for (const name of accounts) {
//       const acc = await prisma.account.findUnique({ where: { name } });
//       if (!acc) {
//         await prisma.account.create({ data: { name } });
//         console.log(`Created account: ${name}`);
//       }
//     }
//   } catch (error) {
//     console.error('Error initializing accounts:', error);
//   }
// };
// initAccounts();

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  console.log(`Login attempt for username: '${username}'`);
  try {
    // Case-insensitive search for username
    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: 'insensitive'
        }
      }
    });
    
    if (user) {
      console.log(`User found: ${user.username}`);
      // Direct password comparison (should be hashed in production)
      if (user.password === password) {
        console.log('Password match');
        res.json({ id: user.id, username: user.username, role: user.role, name: user.name });
      } else {
        console.log(`Password mismatch. Expected: '${user.password}', Got: '${password}'`);
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      console.log('User not found');
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
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

// Update Transaction
app.put('/api/transaction/:id', async (req, res) => {
  const { id } = req.params;
  const { date, type, amount, description, category, accountId, clientId, isPending } = req.body;
  
  try {
    const oldTransaction = await prisma.transaction.findUnique({ where: { id: parseInt(id) } });
    if (!oldTransaction) return res.status(404).json({ error: 'Transaction not found' });

    // 1. Revert old balance effect if it wasn't pending and had an account
    if (!oldTransaction.isPending && oldTransaction.accountId) {
      const oldAccount = await prisma.account.findUnique({ where: { id: oldTransaction.accountId } });
      if (oldAccount) {
        const revertAmount = oldTransaction.type === 'INCOME' ? -oldTransaction.amount : oldTransaction.amount;
        await prisma.account.update({
          where: { id: oldTransaction.accountId },
          data: { balance: oldAccount.balance + revertAmount }
        });
      }
    }

    // 2. Update transaction
    const updatedTransaction = await prisma.transaction.update({
      where: { id: parseInt(id) },
      data: {
        date: date ? new Date(date) : undefined,
        type,
        amount: amount ? parseFloat(amount) : undefined,
        description,
        category,
        accountId: accountId ? parseInt(accountId) : null,
        clientId: clientId ? parseInt(clientId) : null,
        isPending: isPending !== undefined ? isPending : undefined
      }
    });

    // 3. Apply new balance effect if not pending and has account
    // Note: We use the updated values (or fall back to old ones if not provided, but prisma update returns the full object)
    if (!updatedTransaction.isPending && updatedTransaction.accountId) {
      const newAccount = await prisma.account.findUnique({ where: { id: updatedTransaction.accountId } });
      if (newAccount) {
        const applyAmount = updatedTransaction.type === 'INCOME' ? updatedTransaction.amount : -updatedTransaction.amount;
        await prisma.account.update({
          where: { id: updatedTransaction.accountId },
          data: { balance: newAccount.balance + applyAmount }
        });
      }
    }

    res.json(updatedTransaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// Delete Transaction
app.delete('/api/transaction/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const transaction = await prisma.transaction.findUnique({ where: { id: parseInt(id) } });
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    // Revert balance effect
    if (!transaction.isPending && transaction.accountId) {
      const account = await prisma.account.findUnique({ where: { id: transaction.accountId } });
      if (account) {
        const revertAmount = transaction.type === 'INCOME' ? -transaction.amount : transaction.amount;
        await prisma.account.update({
          where: { id: transaction.accountId },
          data: { balance: account.balance + revertAmount }
        });
      }
    }

    await prisma.transaction.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Get Transactions (Unified with Drawings)
app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: { account: true, client: true },
    });

    const drawings = await prisma.partnerDrawing.findMany({
      include: { partner: true, account: true },
    });

    // Normalize Drawings to look like Transactions
    const normalizedDrawings = drawings.map(d => ({
      id: d.id,
      originalId: d.id, // Keep original ID for editing/deleting
      date: d.date,
      type: 'EXPENSE',
      amount: d.amount,
      description: `Partner Drawing - ${d.partner.name}`,
      category: 'partner_drawing',
      accountId: d.accountId,
      account: d.account,
      clientId: null,
      client: null,
      isPending: false, // Transaction pending logic is different from Drawing repayment
      // Custom fields
      isDrawing: true,
      isRepaid: d.isRepaid,
      partnerId: d.partnerId,
      partner: d.partner
    }));

    // Add a flag to regular transactions
    const normalizedTransactions = transactions.map(t => ({
      ...t,
      originalId: t.id,
      isDrawing: false
    }));

    const combined = [...normalizedTransactions, ...normalizedDrawings].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json(combined);
  } catch (error) {
    console.error(error);
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

// Update Drawing
app.put('/api/drawing/:id', async (req, res) => {
  const { id } = req.params;
  const { amount, date, accountId, isRepaid } = req.body;
  
  try {
    const oldDrawing = await prisma.partnerDrawing.findUnique({ where: { id: parseInt(id) } });
    if (!oldDrawing) return res.status(404).json({ error: 'Drawing not found' });

    // 1. Revert old balance effect
    // Drawings are expenses (deductions) from the account.
    // If it was repaid, the money was put back, so we take it out.
    // If it wasn't repaid, the money was taken out, so we put it back.
    if (oldDrawing.accountId) {
      const oldAccount = await prisma.account.findUnique({ where: { id: oldDrawing.accountId } });
      if (oldAccount) {
        let revertAmount = 0;
        if (oldDrawing.isRepaid) {
           // It was repaid, meaning balance is "normal". But wait, the initial drawing reduced balance.
           // Repaying increases it back.
           // So net effect of a repaid drawing is 0 on the account ( -amount + amount ).
           // Net effect of an unrepaid drawing is -amount.
           
           // Actually, let's stick to the logic:
           // Initial creation: Balance - Amount
           // Marking repaid: Balance + Amount
           
           // So if we are changing the drawing, we should first "undo" everything.
           // If isRepaid was true: We added amount back. So we subtract it.
           // AND we also subtract the initial deduction? No, we add it back.
           
           // Let's simplify:
           // Current Balance = Base - Amount + (isRepaid ? Amount : 0)
           // To revert to Base: Balance + Amount - (isRepaid ? Amount : 0)
           
           revertAmount = oldDrawing.amount - (oldDrawing.isRepaid ? oldDrawing.amount : 0);
        } else {
           // Not repaid. Balance = Base - Amount.
           // Revert: Balance + Amount.
           revertAmount = oldDrawing.amount;
        }
        
        await prisma.account.update({
          where: { id: oldDrawing.accountId },
          data: { balance: oldAccount.balance + revertAmount }
        });
      }
    }

    // 2. Update Drawing
    const updatedDrawing = await prisma.partnerDrawing.update({
      where: { id: parseInt(id) },
      data: {
        amount: amount ? parseFloat(amount) : undefined,
        date: date ? new Date(date) : undefined,
        accountId: accountId ? parseInt(accountId) : undefined,
        isRepaid: isRepaid !== undefined ? isRepaid : undefined
      }
    });

    // 3. Apply new balance effect
    if (updatedDrawing.accountId) {
      const newAccount = await prisma.account.findUnique({ where: { id: updatedDrawing.accountId } });
      if (newAccount) {
        // Effect: -Amount + (isRepaid ? Amount : 0)
        const applyAmount = -updatedDrawing.amount + (updatedDrawing.isRepaid ? updatedDrawing.amount : 0);
        
        await prisma.account.update({
          where: { id: updatedDrawing.accountId },
          data: { balance: newAccount.balance + applyAmount }
        });
      }
    }

    res.json(updatedDrawing);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update drawing' });
  }
});

// Delete Drawing
app.delete('/api/drawing/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const drawing = await prisma.partnerDrawing.findUnique({ where: { id: parseInt(id) } });
    if (!drawing) return res.status(404).json({ error: 'Drawing not found' });

    // Revert balance effect
    if (drawing.accountId) {
      const account = await prisma.account.findUnique({ where: { id: drawing.accountId } });
      if (account) {
        // Revert logic: Balance + Amount - (isRepaid ? Amount : 0)
        const revertAmount = drawing.amount - (drawing.isRepaid ? drawing.amount : 0);
        await prisma.account.update({
          where: { id: drawing.accountId },
          data: { balance: account.balance + revertAmount }
        });
      }
    }

    await prisma.partnerDrawing.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Drawing deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete drawing' });
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
      include: { partner: true },
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

// Debug route to check file system
app.get('/api/debug-files', (req, res) => {
  const fs = require('fs');
  const publicPath = path.join(__dirname, 'public');
  const assetsPath = path.join(publicPath, 'assets');
  
  let info = {
    dirname: __dirname,
    publicPath,
    publicExists: fs.existsSync(publicPath),
    publicFiles: [],
    assetsExists: fs.existsSync(assetsPath),
    assetsFiles: []
  };

  if (info.publicExists) {
    info.publicFiles = fs.readdirSync(publicPath);
  }
  if (info.assetsExists) {
    info.assetsFiles = fs.readdirSync(assetsPath);
  }

  res.json(info);
});

// Serve React App for all non-API routes (for production)
app.get(/^(?!\/api).*/, (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error sending index.html:', err);
      // Debugging info for the user
      const fs = require('fs');
      let debugInfo = `Error loading application.<br>Tried to serve: ${indexPath}<br>Error: ${err.message}<br>`;
      
      try {
        debugInfo += `Current directory: ${__dirname}<br>`;
        debugInfo += `Contents of current directory: ${fs.readdirSync(__dirname).join(', ')}<br>`;
        const publicPath = path.join(__dirname, 'public');
        if (fs.existsSync(publicPath)) {
           debugInfo += `Contents of public directory: ${fs.readdirSync(publicPath).join(', ')}<br>`;
        } else {
           debugInfo += `Public directory does not exist at ${publicPath}<br>`;
        }
      } catch (e) {
        debugInfo += `Error gathering debug info: ${e.message}`;
      }
      
      res.status(500).send(debugInfo);
    }
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;


