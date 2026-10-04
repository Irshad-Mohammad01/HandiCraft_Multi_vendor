import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Search, Mail, Shield, X, AlertCircle } from 'lucide-react';
import { adminApi } from '../../api/admin';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function OwnerSubOwners() {
  const [subOwners, setSubOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    phone: ''
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadSubOwners();
  }, []);

  const loadSubOwners = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers();
      const list = res.users || res || [];
      const filtered = list.filter(u => u.role === 'sub_owner');
      setSubOwners(filtered);
    } catch (err) {
      console.error('Failed to load sub owners:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubOwner = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      await adminApi.createUser({
        ...formData,
        role: 'sub_owner'
      });
      setShowModal(false);
      setFormData({ username: '', email: '', password: '', phone: '' });
      await loadSubOwners();
    } catch (err) {
      console.error('Error creating sub owner:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to create sub-owner account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout role="owner" activeNav="sub-owners">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.875rem', color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
            Sub-Owner Operations Team
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            Delegate operational fulfillment and catalog inspection duties to platform staff
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => { setErrorMsg(''); setShowModal(true); }}>
          Add Sub-Owner Account
        </Button>
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
            <LoadingSpinner text="Retrieving sub-owners..." />
          </div>
        ) : subOwners.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <UserCheck size={40} color="var(--color-border)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ margin: '0 0 6px 0', color: 'var(--color-text-primary)' }}>No Sub-Owners Assigned</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Add staff members to delegate inventory and fulfillment operations.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-warm-cream)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Staff Member</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Login Email</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Contact</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Access Tier</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {subOwners.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
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
                          fontSize: '0.85rem'
                        }}>
                          {(u.username || u.email || 'S')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{u.username || 'Operations Staff'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>ID: #{u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--color-text-secondary)' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--color-text-secondary)' }}>
                      {u.phone || '—'}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, backgroundColor: 'var(--color-warm-cream)', border: '1px solid var(--color-border)', padding: '2px 8px', borderRadius: 'var(--radius-full)', color: 'var(--color-primary-terracotta)' }}>
                        OPERATIONAL SUB-OWNER
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <Badge variant="success">Active</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Sub Owner Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--color-white)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '500px',
            padding: '32px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', margin: 0, color: 'var(--color-text-primary)' }}>
                Create Sub-Owner Account
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div style={{ padding: '12px', backgroundColor: '#FFEBEE', color: 'var(--color-error)', borderRadius: 'var(--radius-sm)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubOwner}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Staff Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="e.g. Priya Sharma"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Login Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="staff@craftnest.com"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Password *</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 6 characters"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={saving}>
                  Create Staff Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
