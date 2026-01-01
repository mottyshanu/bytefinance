import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Lock, User } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.startsWith('http')) 
  ? import.meta.env.VITE_API_URL 
  : (import.meta.env.MODE === 'production' ? 'https://bytefinance-five.vercel.app/api' : 'http://localhost:5001/api');

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post(`${API_URL}/login`, { username, password });
      const { id, role } = response.data;
      if (role === 'ADMIN') {
        navigate('/admin');
      } else if (role === 'PARTNER') {
        navigate(`/partner/${id}`);
      }
    } catch (error) {
      setError('Invalid credentials. Please try again.');
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      width: '100%',
      background: 'radial-gradient(circle at center, #1a1a1a 0%, #000000 100%)'
    }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card responsive-padding"
        style={{ width: '100%', maxWidth: '400px', padding: '3rem' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>ByteFinance</h1>
          <p className="text-muted">Premium Finance Tracking</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <User size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-light-grey)' }} />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ paddingLeft: '3rem' }}
            />
          </div>
          
          <div style={{ position: 'relative' }}>
            <Lock size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-light-grey)' }} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: '3rem' }}
            />
          </div>

          {error && <p className="text-danger" style={{ fontSize: '0.9rem', textAlign: 'center' }}>{error}</p>}

          <button type="submit" style={{ marginTop: '1rem' }}>
            Access Dashboard
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default Login;
