import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { adminApi } from '../../api/admin';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import MetricCard from '../../components/dashboard/MetricCard';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function OwnerPayments() {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const [payRes, statRes] = await Promise.allSettled([
        adminApi.getPayments(),
        adminApi.getStats()
      ]);

      if (payRes.status === 'fulfilled') {
        const list = payRes.value.payments || payRes.value || [];
        setPayments(list);
      }
      if (statRes.status === 'fulfilled') {
        setStats(statRes.value);
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalCollected = payments.reduce((acc, p) => acc + (p.status === 'completed' || p.status === 'paid' ? Number(p.amount || 0) : 0), 0);

  return (
    <DashboardLayout role="owner" activeNav="payments">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.875rem', color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
          Payment & Revenue Settlements
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.95rem' }}>
          Trace incoming patron transactions, gateway clearances, and cash-on-delivery settlements
        </p>
      </div>

      {/* Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <MetricCard
          title="Settled Revenue"
          value={`₹${(totalCollected || Number(stats?.total_revenue || 0)).toLocaleString('en-IN')}`}
          icon={DollarSign}
          trend="Verified clearances"
        />
        <MetricCard
          title="Total Transactions"
          value={payments.length || stats?.total_orders || 0}
          icon={CreditCard}
          trend="Successful payments"
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
            <LoadingSpinner text="Retrieving transaction records..." />
          </div>
        ) : payments.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <CreditCard size={40} color="var(--color-border)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ margin: '0 0 6px 0', color: 'var(--color-text-primary)' }}>No payment transactions</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Transactions will automatically record here upon checkout completion.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-warm-cream)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Txn ID / Ref</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Associated Order</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Settled Amount</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Payment Mode</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Status</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      #{p.id || p.transaction_id || 'TXN-AUTO'}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--color-primary-terracotta)', fontWeight: 600 }}>
                      Order #{p.order_id}
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      ₹{Number(p.amount).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                        {p.payment_method || 'ONLINE/UPI'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <Badge variant={p.status === 'completed' || p.status === 'paid' ? 'success' : 'warning'}>
                        {p.status?.toUpperCase() || 'COMPLETED'}
                      </Badge>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--color-text-secondary)' }}>
                      {new Date(p.created_at || Date.now()).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
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
