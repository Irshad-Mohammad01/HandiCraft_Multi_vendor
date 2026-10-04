import React, { useState, useEffect } from 'react';
import { Users, Search, ShieldCheck, ShieldAlert, Mail, Phone, Calendar } from 'lucide-react';
import { adminApi } from '../../api/admin';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function OwnerCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      let res;
      if (adminApi.getUsers) {
        res = await adminApi.getUsers();
      } else {
        res = await adminApi.getCustomers();
      }
      const list = res.users || res.customers || res || [];
      // Filter patrons/customers
      const patrons = list.filter(u => !u.role || u.role === 'customer' || u.role === 'user');
      setCustomers(patrons);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const action = user.is_active ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} patron ${user.username || user.email}?`)) return;

    try {
      if (adminApi.toggleUserStatus) {
        await adminApi.toggleUserStatus(user.id);
      }
      setCustomers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    } catch (err) {
      console.error('Error toggling patron status:', err);
      alert('Unable to change patron status.');
    }
  };

  const filtered = customers.filter(c => 
    (c.username && c.username.toLowerCase().includes(search.toLowerCase())) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout role="owner" activeNav="customers">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.875rem', color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
          Patron Directory
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.95rem' }}>
          Registered handicraft connoisseurs, collectors, and supporters across India
        </p>
      </div>

      {/* Search Bar */}
      <div style={{
        backgroundColor: 'var(--color-white)',
        padding: '16px 20px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        alignItems: 'center',
        maxWidth: '480px'
      }}>
        <Search size={18} color="var(--color-text-secondary)" />
        <input
          type="text"
          placeholder="Search by patron name or email address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}
        />
      </div>

      <div style={{
        backgroundColor: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {loading ? (
          <div style={{ padding: '48px 0' }}>
            <LoadingSpinner text="Retrieving patrons..." />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <Users size={40} color="var(--color-border)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ margin: '0 0 6px 0', color: 'var(--color-text-primary)' }}>No patrons found</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Adjust your search filter.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-warm-cream)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Patron</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Email</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Phone</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Status</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-primary-terracotta)',
                          color: 'var(--color-white)',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.9rem'
                        }}>
                          {(user.username || user.email || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {user.username || 'Craft Patron'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>ID: #{user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--color-text-secondary)' }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--color-text-secondary)' }}>
                      {user.phone || '—'}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <Badge variant={user.is_active !== false ? 'success' : 'error'}>
                        {user.is_active !== false ? 'Active' : 'Suspended'}
                      </Badge>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleToggleStatus(user)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: user.is_active !== false ? '1px solid #FFCDD2' : '1px solid #C8E6C9',
                          backgroundColor: user.is_active !== false ? '#FFF5F5' : '#E8F5E9',
                          color: user.is_active !== false ? 'var(--color-error)' : 'var(--color-success)',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 500
                        }}
                      >
                        {user.is_active !== false ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
