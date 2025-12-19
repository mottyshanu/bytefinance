import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryLabel } from '../utils/categories';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [accounts, setAccounts] = useState([]);
  const [clients, setClients] = useState([]);
  const [partners, setPartners] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', type: 'EXPENSE' });
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState('');

  // Filters
  const [filterDate, setFilterDate] = useState('ALL'); // ALL, MONTH, YEAR, CUSTOM
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [filterType, setFilterType] = useState('ALL'); // ALL, INCOME, EXPENSE
  const [filterCategory, setFilterCategory] = useState('ALL');

  const [transactionForm, setTransactionForm] = useState({
    type: 'EXPENSE',
    amount: '',
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    accountId: '',
    clientId: '',
    partnerId: '',
    isPending: false
  });

  const [editingType, setEditingType] = useState('TRANSACTION'); // 'TRANSACTION' or 'DRAWING'

  const [drawingForm, setDrawingForm] = useState({
    partnerId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    accountId: ''
  });

  const [newClient, setNewClient] = useState('');

  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [editingDrawingId, setEditingDrawingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accRes, cliRes, partRes, txRes, drawRes, catRes] = await Promise.all([
        axios.get(`${API_URL}/accounts`),
        axios.get(`${API_URL}/clients`),
        axios.get(`${API_URL}/partners`),
        axios.get(`${API_URL}/transactions`),
        axios.get(`${API_URL}/drawings`),
        axios.get(`${API_URL}/categories`)
      ]);
      setAccounts(accRes.data);
      setClients(cliRes.data);
      setPartners(partRes.data);
      setTransactions(txRes.data);
      setDrawings(drawRes.data);
      setCategories(catRes.data);
    } catch (error) {
      console.error('Error fetching data', error);
    }
  };

  const handleLogout = () => navigate('/login');

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    try {
      if (transactionForm.category === 'partner_drawing') {
        // Handle Drawing
        const payload = {
          partnerId: transactionForm.partnerId,
          amount: transactionForm.amount,
          date: transactionForm.date,
          accountId: transactionForm.accountId,
          isRepaid: !transactionForm.isPending // Checkbox "Pending" means NOT repaid
        };

        if (editingTransactionId && editingType === 'DRAWING') {
           await axios.put(`${API_URL}/drawing/${editingTransactionId}`, payload);
        } else {
           await axios.post(`${API_URL}/drawing`, payload);
        }
      } else {
        // Handle Regular Transaction
        if (editingTransactionId && editingType === 'TRANSACTION') {
          await axios.put(`${API_URL}/transaction/${editingTransactionId}`, transactionForm);
        } else {
          await axios.post(`${API_URL}/transaction`, transactionForm);
        }
      }
      
      setEditingTransactionId(null);
      setEditingType('TRANSACTION');
      fetchData();
      setTransactionForm({
        type: 'EXPENSE',
        amount: '',
        description: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        accountId: '',
        clientId: '',
        partnerId: '',
        isPending: false
      });
    } catch (error) {
      console.error(error);
      alert('Failed to save transaction');
    }
  };

  const handleDeleteTransaction = async (tx) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      if (tx.isDrawing) {
        await axios.delete(`${API_URL}/drawing/${tx.id}`);
      } else {
        await axios.delete(`${API_URL}/transaction/${tx.id}`);
      }
      fetchData();
    } catch (error) {
      alert('Failed to delete transaction');
    }
  };

  const handleEditTransaction = (tx) => {
    setEditingTransactionId(tx.id);
    
    if (tx.isDrawing) {
      setEditingType('DRAWING');
      setTransactionForm({
        type: 'EXPENSE',
        amount: tx.amount,
        description: tx.description,
        category: 'partner_drawing',
        date: new Date(tx.date).toISOString().split('T')[0],
        accountId: tx.accountId || '',
        clientId: '',
        partnerId: tx.partnerId,
        isPending: !tx.isRepaid
      });
    } else {
      setEditingType('TRANSACTION');
      setTransactionForm({
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        category: tx.category,
        date: new Date(tx.date).toISOString().split('T')[0],
        accountId: tx.accountId || '',
        clientId: tx.clientId || '',
        partnerId: '',
        isPending: tx.isPending
      });
    }
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDrawingSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDrawingId) {
        await axios.put(`${API_URL}/drawing/${editingDrawingId}`, drawingForm);
        setEditingDrawingId(null);
      } else {
        await axios.post(`${API_URL}/drawing`, drawingForm);
      }
      fetchData();
      setDrawingForm({
        partnerId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        accountId: ''
      });
    } catch (error) {
      alert('Failed to save drawing');
    }
  };

  const handleDeleteDrawing = async (id) => {
    if (!confirm('Are you sure you want to delete this drawing?')) return;
    try {
      await axios.delete(`${API_URL}/drawing/${id}`);
      fetchData();
    } catch (error) {
      alert('Failed to delete drawing');
    }
  };

  const handleEditDrawing = (d) => {
    setEditingDrawingId(d.id);
    setDrawingForm({
      partnerId: d.partnerId,
      amount: d.amount,
      date: new Date(d.date).toISOString().split('T')[0],
      accountId: d.accountId || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getFilteredTransactions = () => {
    return transactions.filter(t => {
      // Filter by Type
      if (filterType !== 'ALL' && t.type !== filterType) return false;

      // Filter by Category
      if (filterCategory !== 'ALL' && t.category !== filterCategory) return false;

      // Filter by Date
      const tDate = new Date(t.date);
      const now = new Date();
      
      if (filterDate === 'MONTH') {
        if (tDate.getMonth() !== now.getMonth() || tDate.getFullYear() !== now.getFullYear()) return false;
      } else if (filterDate === 'YEAR') {
        if (tDate.getFullYear() !== now.getFullYear()) return false;
      } else if (filterDate === 'CUSTOM') {
        if (customDateRange.start && new Date(customDateRange.start) > tDate) return false;
        if (customDateRange.end && new Date(customDateRange.end) < tDate) return false;
      }

      return true;
    });
  };

  const stats = {
    totalIncome: transactions.filter(t => t.type === 'INCOME' && !t.isPending).reduce((sum, t) => sum + t.amount, 0),
    totalExpenses: transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0),
    pendingIncome: transactions.filter(t => t.isPending && t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0),
    mainBalance: accounts.find(a => a.name === 'Main')?.balance || 0,
    retainBalance: accounts.find(a => a.name === 'Retain')?.balance || 0
  };

  // Chart Data Preparation
  const monthlyData = transactions.reduce((acc, t) => {
    const date = new Date(t.date);
    const month = date.toLocaleString('default', { month: 'short' });
    const existing = acc.find(d => d.name === month);
    if (existing) {
      if (t.type === 'INCOME') existing.income += t.amount;
      else existing.expense += t.amount;
    } else {
      acc.push({
        name: month,
        income: t.type === 'INCOME' ? t.amount : 0,
        expense: t.type === 'EXPENSE' ? t.amount : 0
      });
    }
    return acc;
  }, []).reverse(); // Assuming transactions are desc

  const expenseCategoryData = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((acc, t) => {
      const existing = acc.find(d => d.name === t.category);
      if (existing) existing.value += t.amount;
      else acc.push({ name: t.category, value: t.amount });
      return acc;
    }, []);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560'];

  const CategoryIcon = ({ name, size = 20 }) => {
    const IconComponent = Icons[name] || Icons.Circle;
    return <IconComponent size={size} />;
  };

  const TabButton = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.875rem 1.25rem',
        background: activeTab === id ? 'var(--color-accent)' : 'transparent',
        color: activeTab === id ? 'var(--color-white)' : 'var(--color-light-grey)',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontWeight: activeTab === id ? 600 : 400,
        fontSize: '0.9375rem'
      }}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-black)', color: 'var(--color-white)' }}>
      {/* Header */}
      <nav className="responsive-nav" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1rem 2rem', 
        background: 'rgba(0,0,0,0.85)', 
        backdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid var(--color-grey)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ fontSize: '1.375rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          ByteFinance <span style={{ fontWeight: 400, fontSize: '0.75em', color: 'var(--color-light-grey)' }}>Admin</span>
        </div>
        <button onClick={handleLogout} className="secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icons.LogOut size={16} /> Logout
        </button>
      </nav>

      {/* Tabs */}
      <div className="responsive-nav" style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        padding: '1rem 2rem', 
        borderBottom: '1px solid var(--color-grey)',
        background: 'var(--color-black)',
        overflowX: 'auto'
      }}>
        <TabButton id="overview" icon={Icons.LayoutDashboard} label="Overview" />
        <TabButton id="transactions" icon={Icons.ArrowUpDown} label="Transactions" />
        <TabButton id="clients" icon={Icons.Users} label="Clients" />
        <TabButton id="drawings" icon={Icons.Wallet} label="Drawings" />
        <TabButton id="pending" icon={Icons.Clock} label="Pending" />
      </div>

      {/* Content */}
      <div className="responsive-padding" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  <div className="card" style={{ background: 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Main Account</div>
                        <div style={{ fontSize: '2.25rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>₹{stats.mainBalance.toLocaleString()}</div>
                      </div>
                      <Icons.Wallet size={32} opacity={0.5} />
                    </div>
                  </div>

                  <div className="card" style={{ background: 'linear-gradient(135deg, #34C759 0%, #248A3D 100%)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Retain Fund</div>
                        <div style={{ fontSize: '2.25rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>₹{stats.retainBalance.toLocaleString()}</div>
                      </div>
                      <Icons.PiggyBank size={32} opacity={0.5} />
                    </div>
                  </div>

                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ color: 'var(--color-light-grey)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Income</div>
                        <div style={{ fontSize: '2.25rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-success)' }}>₹{stats.totalIncome.toLocaleString()}</div>
                      </div>
                      <Icons.TrendingUp size={32} color="var(--color-success)" opacity={0.5} />
                    </div>
                  </div>

                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ color: 'var(--color-light-grey)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Expenses</div>
                        <div style={{ fontSize: '2.25rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-danger)' }}>₹{stats.totalExpenses.toLocaleString()}</div>
                      </div>
                      <Icons.TrendingDown size={32} color="var(--color-danger)" opacity={0.5} />
                    </div>
                  </div>

                  <div className="card" style={{ background: 'linear-gradient(135deg, #FF9500 0%, #C77700 100%)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Pending Income</div>
                        <div style={{ fontSize: '2.25rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>₹{stats.pendingIncome.toLocaleString()}</div>
                      </div>
                      <Icons.Clock size={32} opacity={0.5} />
                    </div>
                  </div>

                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ color: 'var(--color-light-grey)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Net Profit</div>
                        <div style={{ fontSize: '2.25rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>₹{(stats.totalIncome - stats.totalExpenses).toLocaleString()}</div>
                      </div>
                      <Icons.DollarSign size={32} opacity={0.5} />
                    </div>
                  </div>
                </div>

                <div className="dashboard-grid">
                  <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Income vs Expense</h3>
                    <div style={{ height: '300px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grey)" vertical={false} />
                          <XAxis dataKey="name" stroke="var(--color-light-grey)" />
                          <YAxis stroke="var(--color-light-grey)" />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--color-medium-grey)', border: '1px solid var(--color-grey)' }}
                            itemStyle={{ color: 'var(--color-white)' }}
                          />
                          <Legend />
                          <Bar dataKey="income" fill="var(--color-success)" name="Income" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="expense" fill="var(--color-danger)" name="Expense" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Expense Breakdown</h3>
                    <div style={{ height: '300px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expenseCategoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {expenseCategoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--color-medium-grey)', border: '1px solid var(--color-grey)' }}
                            itemStyle={{ color: 'var(--color-white)' }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="split-grid">
                <div className="card">
                  <h2 style={{ marginBottom: '1.5rem' }}>{editingTransactionId ? 'Edit Transaction' : 'New Transaction'}</h2>
                  <form onSubmit={handleTransactionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <button 
                        type="button" 
                        onClick={() => setTransactionForm({...transactionForm, type: 'EXPENSE', category: ''})}
                        style={{ 
                          background: transactionForm.type === 'EXPENSE' ? 'var(--color-danger)' : 'var(--color-grey)',
                          color: 'white',
                          fontWeight: 600
                        }}
                      ><Icons.TrendingDown size={16} style={{ marginRight: '0.5rem', display: 'inline' }} />Expense</button>
                      <button 
                        type="button" 
                        onClick={() => setTransactionForm({...transactionForm, type: 'INCOME', category: ''})}
                        style={{ 
                          background: transactionForm.type === 'INCOME' ? 'var(--color-success)' : 'var(--color-grey)',
                          color: 'white',
                          fontWeight: 600
                        }}
                      ><Icons.TrendingUp size={16} style={{ marginRight: '0.5rem', display: 'inline' }} />Income</button>
                    </div>
                    
                    <input type="number" placeholder="Amount (₹)" value={transactionForm.amount} onChange={e => setTransactionForm({...transactionForm, amount: e.target.value})} required />
                    
                    {transactionForm.category !== 'partner_drawing' && (
                      <input type="text" placeholder="Description" value={transactionForm.description} onChange={e => setTransactionForm({...transactionForm, description: e.target.value})} required />
                    )}
                    
                    <select 
                      value={transactionForm.category} 
                      onChange={e => {
                        if (e.target.value === 'ADD_NEW') {
                          setShowAddCategory(true);
                          setNewCategory({ ...newCategory, type: transactionForm.type });
                        } else {
                          setTransactionForm({...transactionForm, category: e.target.value});
                        }
                      }} 
                      required
                    >
                      <option value="">Select Category</option>
                      {(transactionForm.type === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                      {categories.filter(c => c.type === transactionForm.type).map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                      <option value="ADD_NEW" style={{ fontWeight: 'bold', color: 'var(--color-accent)' }}>+ Add New Category</option>
                    </select>

                    {transactionForm.category === 'partner_drawing' && (
                      <select value={transactionForm.partnerId} onChange={e => setTransactionForm({...transactionForm, partnerId: e.target.value})} required>
                        <option value="">Select Partner</option>
                        {partners.map(p => <option key={p.id} value={p.id}>{p.name || p.username}</option>)}
                      </select>
                    )}

                    {showAddCategory && (
                      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem', background: 'var(--color-medium-grey)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-grey)' }}>
                        <input 
                          type="text" 
                          placeholder="New Category Name" 
                          value={newCategory.name} 
                          onChange={e => setNewCategory({...newCategory, name: e.target.value})}
                          style={{ flex: 1, margin: 0 }}
                        />
                        <button type="button" onClick={handleAddCategory} style={{ padding: '0.5rem 1rem' }}>Add</button>
                        <button type="button" onClick={() => setShowAddCategory(false)} className="secondary" style={{ padding: '0.5rem' }}><Icons.X size={16} /></button>
                      </div>
                    )}

                    <select value={transactionForm.accountId} onChange={e => setTransactionForm({...transactionForm, accountId: e.target.value})} required>
                      <option value="">Select Account</option>
                      {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>

                    {transactionForm.type === 'INCOME' && (
                      <select value={transactionForm.clientId} onChange={e => setTransactionForm({...transactionForm, clientId: e.target.value})}>
                        <option value="">Select Client (Optional)</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}

                    {(transactionForm.type === 'INCOME' || transactionForm.category === 'partner_drawing') && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input type="checkbox" checked={transactionForm.isPending} onChange={e => setTransactionForm({...transactionForm, isPending: e.target.checked})} />
                          {transactionForm.category === 'partner_drawing' ? 'Mark as Pending Return' : 'Mark as Pending Payment'}
                        </label>
                    )}

                    <input type="date" value={transactionForm.date} onChange={e => setTransactionForm({...transactionForm, date: e.target.value})} required />

                    <button type="submit" style={{ marginTop: '0.5rem' }}>
                      <Icons.Plus size={16} style={{ marginRight: '0.5rem', display: 'inline' }} />Add Transaction
                    </button>
                  </form>
                </div>

                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0 }}>Transactions</h2>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-light-grey)' }}>
                      Showing {getFilteredTransactions().length} records
                    </div>
                  </div>

                  {/* Filters */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <select value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ width: 'auto', padding: '0.5rem' }}>
                      <option value="ALL">All Time</option>
                      <option value="MONTH">This Month</option>
                      <option value="YEAR">This Year</option>
                      <option value="CUSTOM">Custom Date</option>
                    </select>

                    {filterDate === 'CUSTOM' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input type="date" value={customDateRange.start} onChange={e => setCustomDateRange({...customDateRange, start: e.target.value})} style={{ width: 'auto', padding: '0.5rem' }} />
                        <input type="date" value={customDateRange.end} onChange={e => setCustomDateRange({...customDateRange, end: e.target.value})} style={{ width: 'auto', padding: '0.5rem' }} />
                      </div>
                    )}

                    <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 'auto', padding: '0.5rem' }}>
                      <option value="ALL">All Types</option>
                      <option value="INCOME">Income Only</option>
                      <option value="EXPENSE">Expense Only</option>
                    </select>

                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ width: 'auto', padding: '0.5rem' }}>
                      <option value="ALL">All Categories</option>
                      <optgroup label="Expenses">
                        {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </optgroup>
                      <optgroup label="Income">
                        {INCOME_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </optgroup>
                      <optgroup label="Custom">
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </optgroup>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '600px', overflowY: 'auto' }}>
                    {getFilteredTransactions().map(t => {
                      const catData = (EXPENSE_CATEGORIES.find(c => c.value === t.category) || INCOME_CATEGORIES.find(c => c.value === t.category));
                      return (
                      <div key={`${t.isDrawing ? 'd' : 't'}-${t.id}`} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '1rem', 
                        background: 'var(--color-medium-grey)', 
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-grey)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                          <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: 'var(--radius-sm)', 
                            background: t.type === 'INCOME' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: t.type === 'INCOME' ? 'var(--color-success)' : 'var(--color-danger)'
                          }}>
                            <CategoryIcon name={catData?.icon || 'Circle'} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{t.description}</div>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--color-light-grey)' }}>
                              {new Date(t.date).toLocaleDateString()} • {getCategoryLabel(t.category, t.type)} • {t.account?.name}
                              {t.isDrawing && (
                                <span style={{ 
                                  marginLeft: '0.5rem', 
                                  padding: '0.1rem 0.4rem', 
                                  borderRadius: '4px', 
                                  fontSize: '0.7rem', 
                                  backgroundColor: t.isRepaid ? 'rgba(52, 199, 89, 0.2)' : 'rgba(255, 149, 0, 0.2)',
                                  color: t.isRepaid ? 'var(--color-success)' : 'var(--color-warning)',
                                  fontWeight: 600
                                }}>
                                  {t.isRepaid ? 'RETURNED' : 'PENDING'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ 
                            fontSize: '1.125rem', 
                            fontWeight: 700, 
                            color: t.type === 'INCOME' ? 'var(--color-success)' : 'var(--color-danger)',
                            fontFamily: 'var(--font-display)'
                          }}>
                            {t.type === 'INCOME' ? '+' : '-'}₹{t.amount.toLocaleString()}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleEditTransaction(t)} style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Edit">
                              <Icons.Edit2 size={16} color="var(--color-light-grey)" />
                            </button>
                            <button onClick={() => handleDeleteTransaction(t)} style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Delete">
                              <Icons.Trash2 size={16} color="var(--color-danger)" />
                            </button>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                    {getFilteredTransactions().length === 0 && (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-light-grey)' }}>
                        No transactions found matching filters.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'clients' && (
              <div className="split-grid">
                <div className="card">
                  <h2 style={{ marginBottom: '1.5rem' }}>Add New Client</h2>
                  <form onSubmit={handleAddClient} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      placeholder="Client Name" 
                      value={newClient} 
                      onChange={e => setNewClient(e.target.value)} 
                      required 
                      style={{ flex: 1 }}
                    />
                    <button type="submit">
                      <Icons.Plus size={16} />
                    </button>
                  </form>
                </div>

                <div className="card">
                  <h2 style={{ marginBottom: '1.5rem' }}>All Clients ({clients.length})</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    {clients.map(c => (
                      <div key={c.id} style={{ 
                        padding: '1rem', 
                        background: 'var(--color-medium-grey)', 
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-grey)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}>
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '50%', 
                          background: 'var(--color-accent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '1.125rem'
                        }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'drawings' && (
              <div className="split-grid">
                <div className="card">
                  <h2 style={{ marginBottom: '1.5rem' }}>{editingDrawingId ? 'Edit Partner Drawing' : 'Record Partner Drawing'}</h2>
                  <form onSubmit={handleDrawingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <select 
                      value={drawingForm.partnerId} 
                      onChange={e => {
                        if (e.target.value === 'ADD_NEW') {
                          setShowAddPartner(true);
                        } else {
                          setDrawingForm({...drawingForm, partnerId: e.target.value});
                        }
                      }} 
                      required
                    >
                      <option value="">Select Partner</option>
                      {partners.map(p => <option key={p.id} value={p.id}>{p.name || p.username}</option>)}
                      <option value="ADD_NEW" style={{ fontWeight: 'bold', color: 'var(--color-accent)' }}>+ Add New Partner</option>
                    </select>

                    {showAddPartner && (
                      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem', background: 'var(--color-medium-grey)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-grey)' }}>
                        <input 
                          type="text" 
                          placeholder="Partner Name" 
                          value={newPartnerName} 
                          onChange={e => setNewPartnerName(e.target.value)}
                          style={{ flex: 1, margin: 0 }}
                        />
                        <button type="button" onClick={handleAddPartner} style={{ padding: '0.5rem 1rem' }}>Add</button>
                        <button type="button" onClick={() => setShowAddPartner(false)} className="secondary" style={{ padding: '0.5rem' }}><Icons.X size={16} /></button>
                      </div>
                    )}
                    
                    <input type="number" placeholder="Amount (₹)" value={drawingForm.amount} onChange={e => setDrawingForm({...drawingForm, amount: e.target.value})} required />
                    
                    <select value={drawingForm.accountId} onChange={e => setDrawingForm({...drawingForm, accountId: e.target.value})} required>
                      <option value="">Select Account to Deduct From</option>
                      {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>

                    <input type="date" value={drawingForm.date} onChange={e => setDrawingForm({...drawingForm, date: e.target.value})} required />

                    <button type="submit">
                      <Icons.Plus size={16} style={{ marginRight: '0.5rem', display: 'inline' }} />{editingDrawingId ? 'Update Drawing' : 'Record Drawing'}
                    </button>
                    {editingDrawingId && (
                      <button type="button" className="secondary" onClick={() => {
                        setEditingDrawingId(null);
                        setDrawingForm({
                          partnerId: '',
                          amount: '',
                          date: new Date().toISOString().split('T')[0],
                          accountId: ''
                        });
                      }}>Cancel Edit</button>
                    )}
                  </form>
                </div>

                <div className="card">
                  <h2 style={{ marginBottom: '1.5rem' }}>Recent Drawings</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {drawings.map(d => (
                      <div key={d.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '1rem', 
                        background: 'var(--color-medium-grey)', 
                        borderRadius: 'var(--radius-sm)',
                        border: d.isRepaid ? '1px solid var(--color-success)' : '1px solid var(--color-warning)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                          <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '50%', 
                            background: 'var(--color-accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: 'white'
                          }}>
                            {d.partner?.name?.charAt(0) || 'P'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{d.partner?.name || 'Partner'}</div>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--color-light-grey)' }}>
                              {new Date(d.date).toLocaleDateString()} • {d.account?.name || 'Unknown Account'}
                            </div>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ 
                              fontSize: '1.125rem', 
                              fontWeight: 700, 
                              fontFamily: 'var(--font-display)',
                              color: 'var(--color-white)'
                            }}>
                              ₹{d.amount.toLocaleString()}
                            </div>
                            <div style={{ 
                              fontSize: '0.75rem', 
                              fontWeight: 600, 
                              color: d.isRepaid ? 'var(--color-success)' : 'var(--color-warning)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}>
                              {d.isRepaid ? 'Returned' : 'Pending'}
                            </div>
                          </div>
                          
                          {!d.isRepaid && (
                            <button 
                              onClick={() => markDrawingRepaid(d.id, true)}
                              title="Mark as Returned"
                              style={{ 
                                background: 'var(--color-success)', 
                                borderRadius: '50%', 
                                width: '36px', 
                                height: '36px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                padding: 0,
                                border: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              <Icons.Check size={18} color="white" />
                            </button>
                          )}
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleEditDrawing(d)} style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Edit">
                              <Icons.Edit2 size={16} color="var(--color-light-grey)" />
                            </button>
                            <button onClick={() => handleDeleteDrawing(d.id)} style={{ padding: '0.25rem', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Delete">
                              <Icons.Trash2 size={16} color="var(--color-danger)" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {drawings.length === 0 && (
                      <div style={{ textAlign: 'center', color: 'var(--color-light-grey)', padding: '2rem' }}>
                        No drawings recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pending' && (
              <div className="card">
                <h2 style={{ marginBottom: '1.5rem' }}>Pending Payments ({transactions.filter(t => t.isPending).length})</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {transactions.filter(t => t.isPending).map(t => (
                    <div key={t.id} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '1.25rem', 
                      background: 'var(--color-medium-grey)', 
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-warning)'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '1.0625rem', marginBottom: '0.5rem' }}>{t.description}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-light-grey)' }}>
                          Client: <span style={{ color: 'var(--color-white)' }}>{t.client?.name || 'Unknown'}</span> • {new Date(t.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-warning)', fontFamily: 'var(--font-display)' }}>₹{t.amount.toLocaleString()}</div>
                        <button onClick={() => markAsPaid(t.id)} style={{ 
                          background: 'var(--color-success)', 
                          borderRadius: '50%', 
                          width: '40px', 
                          height: '40px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          padding: 0
                        }}>
                          <Icons.Check size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {transactions.filter(t => t.isPending).length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--color-light-grey)', padding: '3rem' }}>
                      <Icons.CheckCircle size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                      <div>No pending payments</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default AdminDashboard;
