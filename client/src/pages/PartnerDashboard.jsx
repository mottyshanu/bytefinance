import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '../utils/icons';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryLabel } from '../utils/categories';
import { DashboardSkeleton } from '../components/Skeleton';

const API_URL = (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.startsWith('http')) 
  ? import.meta.env.VITE_API_URL 
  : (import.meta.env.MODE === 'production' ? 'https://bytefinance-five.vercel.app/api' : 'http://localhost:5001/api');

function PartnerDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);

  // Filters
  const [filterDate, setFilterDate] = useState('ALL');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [filterType, setFilterType] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterClient, setFilterClient] = useState('ALL');
  const [clients, setClients] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id || id === 'undefined') {
        console.error('No partner ID provided');
        navigate('/login');
        return;
      }

      setLoading(true);
      try {
        console.log(`Fetching partner data for ID: ${id} from ${API_URL}`);
        const [dashboardRes, txRes, catRes, clientRes] = await Promise.all([
          axios.get(`${API_URL}/dashboard/partner/${id}`),
          axios.get(`${API_URL}/transactions`),
          axios.get(`${API_URL}/categories`),
          axios.get(`${API_URL}/clients`)
        ]);

        console.log('Dashboard response:', dashboardRes.data);

        // Check if response is HTML (which means proxy failed or 404 fallback)
        if (typeof dashboardRes.data === 'string' && dashboardRes.data.trim().startsWith('<!doctype html>')) {
          console.error('API returned HTML instead of JSON. Check API URL and Proxy configuration.');
          throw new Error('API Configuration Error: Received HTML instead of JSON');
        }

        if (dashboardRes.data && typeof dashboardRes.data === 'object') {
          setData(dashboardRes.data);
        } else {
          console.error('Dashboard API returned invalid data:', dashboardRes.data);
          // Set empty structure to prevent crash
          setData({
            expenses: [],
            drawings: [],
            salary: null,
            pendingClients: [],
            freelancerPayments: [],
            retainFund: { balance: 0 },
            mainAccount: { balance: 0 }
          });
        }

        if (Array.isArray(txRes.data)) {
          setTransactions(txRes.data);
        } else {
          console.error('Transactions API returned non-array:', txRes.data);
          setTransactions([]);
        }
        
        if (Array.isArray(catRes.data)) {
          setCategories(catRes.data);
        } else {
          console.error('Categories API returned non-array:', catRes.data);
          setCategories([]);
        }

        if (Array.isArray(clientRes.data)) {
          setClients(clientRes.data);
        } else {
          setClients([]);
        }
      } catch (error) {
        console.error('Failed to fetch data', error);
        // Ensure we stop loading even if there's an error
        setData({
          expenses: [],
          drawings: [],
          salary: null,
          pendingClients: [],
          freelancerPayments: [],
          retainFund: { balance: 0 },
          mainAccount: { balance: 0 }
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleLogout = () => {
    navigate('/login');
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--color-black)', color: 'var(--color-white)' }}>
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
          ByteFinance <span style={{ fontWeight: 400, fontSize: '0.75em', color: 'var(--color-light-grey)' }}>Partner</span>
        </div>
      </nav>
      <DashboardSkeleton />
    </div>
  );

  if (!data) return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--color-black)', color: 'var(--color-white)' }}>
      <div>Failed to load dashboard data.</div>
    </div>
  );

  // Chart Data Preparation
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  // Ensure we have valid data before processing
  const monthlyData = safeTransactions.length > 0 ? safeTransactions.reduce((acc, t) => {
    if (!t || !t.date) return acc;
    const date = new Date(t.date);
    if (isNaN(date.getTime())) return acc;
    
    const month = date.toLocaleString('default', { month: 'short' });
    const existing = acc.find(d => d.name === month);
    if (existing) {
      if (t.type === 'INCOME') existing.income += (t.amount || 0);
      else existing.expense += (t.amount || 0);
    } else {
      acc.push({
        name: month,
        income: t.type === 'INCOME' ? (t.amount || 0) : 0,
        expense: t.type === 'EXPENSE' ? (t.amount || 0) : 0
      });
    }
    return acc;
  }, []).reverse() : [];

  // Ensure we have at least some data for charts to prevent Recharts width(-1) error
  const hasChartData = monthlyData.length > 0;

  const expenseCategoryData = safeTransactions.length > 0 ? safeTransactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((acc, t) => {
      if (!t || !t.category) return acc;
      const existing = acc.find(d => d.name === t.category);
      if (existing) existing.value += (t.amount || 0);
      else acc.push({ name: t.category, value: (t.amount || 0) });
      return acc;
    }, []) : [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560'];

  const getFilteredTransactions = () => {
    return safeTransactions.filter(t => {
      if (filterType !== 'ALL' && t.type !== filterType) return false;
      if (filterCategory !== 'ALL' && t.category !== filterCategory) return false;
      if (filterClient !== 'ALL' && t.clientId !== parseInt(filterClient)) return false;
      
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

  const CategoryIcon = ({ name, size = 20 }) => {
    const IconComponent = Icons[name] || Icons.Circle;
    if (!IconComponent) return null;
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
          ByteFinance <span style={{ fontWeight: 400, fontSize: '0.75em', color: 'var(--color-light-grey)' }}>Partner</span>
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
      </div>

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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {/* Retain Fund / Current Balance - Hero Card */}
                <div className="card col-span-2" style={{ background: 'linear-gradient(135deg, #34C759 0%, #248A3D 100%)', border: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h2 style={{ marginBottom: '0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.8)' }}>Retain Fund Balance</h2>
                      <div style={{ fontSize: '3.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>₹{data.retainFund?.balance?.toLocaleString() || 0}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.2)', padding: '1.5rem', borderRadius: '50%' }}>
                      <Icons.DollarSign size={48} color="white" />
                    </div>
                  </div>
                </div>

                {/* Main Account Balance */}
                <div className="card col-span-2" style={{ background: 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)', border: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h2 style={{ marginBottom: '0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.8)' }}>Main Account Balance</h2>
                      <div style={{ fontSize: '3.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>₹{data.mainAccount?.balance?.toLocaleString() || 0}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.2)', padding: '1.5rem', borderRadius: '50%' }}>
                      <Icons.CreditCard size={48} color="white" />
                    </div>
                  </div>
                </div>

                {/* Charts */}
                <div className="card col-span-2">
                  <h3 style={{ marginBottom: '1.5rem' }}>Income vs Expense</h3>
                  <div style={{ height: '300px', width: '100%' }}>
                    {hasChartData ? (
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
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--color-light-grey)' }}>
                        No transaction data available
                      </div>
                    )}
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ marginBottom: '1.5rem' }}>Expense Breakdown</h3>
                  <div style={{ height: '300px', width: '100%' }}>
                    {expenseCategoryData.length > 0 ? (
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
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--color-light-grey)' }}>
                        No expense data available
                      </div>
                    )}
                  </div>
                </div>

                {/* Partner Drawings */}
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.5rem', background: 'rgba(10, 132, 255, 0.1)', borderRadius: '8px' }}>
                      <Icons.CreditCard size={20} color="var(--color-accent)" />
                    </div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>All Partner Drawings</h3>
                  </div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {data.drawings.length === 0 ? (
                      <p style={{ color: 'var(--color-light-grey)', textAlign: 'center', padding: '2rem' }}>No drawings found.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {data.drawings.map(d => (
                          <div key={d.id} style={{ 
                            padding: '1rem', 
                            background: 'var(--color-medium-grey)', 
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-grey)',
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center' 
                          }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '1.125rem', fontFamily: 'var(--font-display)' }}>₹{d.amount.toLocaleString()}</div>
                              <div style={{ fontSize: '0.8125rem', color: 'var(--color-light-grey)' }}>
                                <span style={{ color: 'var(--color-white)', fontWeight: 600 }}>{d.partner?.name || 'Unknown'}</span> • {new Date(d.date).toLocaleDateString()}
                              </div>
                            </div>
                            <span style={{ 
                              padding: '0.25rem 0.75rem', 
                              borderRadius: '12px', 
                              fontSize: '0.75rem', 
                              fontWeight: 600,
                              backgroundColor: d.isRepaid ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 149, 0, 0.1)',
                              color: d.isRepaid ? 'var(--color-success)' : 'var(--color-warning)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}>
                              {d.isRepaid ? 'Returned' : 'Pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Partner Salary */}
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.5rem', background: 'rgba(175, 82, 222, 0.1)', borderRadius: '8px' }}>
                      <Icons.Briefcase size={20} color="#AF52DE" />
                    </div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Salary Status</h3>
                  </div>
                  {data.salary ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                      <div style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>₹{data.salary.amount.toLocaleString()}</div>
                      <div style={{ 
                        display: 'inline-block',
                        padding: '0.5rem 1rem', 
                        borderRadius: '20px', 
                        backgroundColor: data.salary.isPaid ? 'var(--color-success)' : 'var(--color-grey)',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        letterSpacing: '0.05em'
                      }}>
                        {data.salary.isPaid ? 'PAID' : 'PENDING'}
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--color-light-grey)', textAlign: 'center' }}>No salary record found for this month.</p>
                  )}
                </div>

                {/* Pending from Clients */}
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.5rem', background: 'rgba(255, 149, 0, 0.1)', borderRadius: '8px' }}>
                      <Icons.Users size={20} color="var(--color-warning)" />
                    </div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Client Receivables</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {data.pendingClients.map(c => (
                      <div key={c.id} style={{ 
                        padding: '1rem', 
                        background: 'var(--color-medium-grey)', 
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-grey)',
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontWeight: 500 }}>{c.client?.name || c.description}</span>
                        <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-warning)' }}>₹{c.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    {data.pendingClients.length === 0 && <p style={{ color: 'var(--color-light-grey)', textAlign: 'center' }}>No pending payments.</p>}
                  </div>
                </div>

                {/* Freelancer Payments */}
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.5rem', background: 'rgba(255, 45, 85, 0.1)', borderRadius: '8px' }}>
                      <Icons.Users size={20} color="#FF2D55" />
                    </div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Freelancer Payments</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {data.freelancerPayments.map(f => (
                      <div key={f.id} style={{ 
                        padding: '1rem', 
                        background: 'var(--color-medium-grey)', 
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-grey)',
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{f.freelancerName}</div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--color-light-grey)' }}>{new Date(f.date).toLocaleDateString()}</div>
                        </div>
                        <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>₹{f.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    {data.freelancerPayments.length === 0 && <p style={{ color: 'var(--color-light-grey)', textAlign: 'center' }}>No payments this month.</p>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
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

                  <select value={filterClient} onChange={e => setFilterClient(e.target.value)} style={{ width: 'auto', padding: '0.5rem' }}>
                    <option value="ALL">All Clients</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                      <div style={{ 
                        fontSize: '1.125rem', 
                        fontWeight: 700, 
                        color: t.type === 'INCOME' ? 'var(--color-success)' : 'var(--color-danger)',
                        fontFamily: 'var(--font-display)'
                      }}>
                        {t.type === 'INCOME' ? '+' : '-'}₹{t.amount.toLocaleString()}
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
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default PartnerDashboard;
