import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Search, Filter, Eye, Truck, 
  CheckCircle, XCircle, AlertCircle, X, FileText, Download 
} from 'lucide-react';
import { adminApi } from '../../api/admin';
import { ordersApi } from '../../api/orders';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'packed', label: 'Packed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' }
];

export default function OwnerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Status Update & View Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      let res;
      if (adminApi.getOrders) {
        res = await adminApi.getOrders();
      } else {
        res = await ordersApi.getAll();
      }
      const list = res.orders || res || [];
      list.sort((a, b) => new Date(b.created_at || b.order_date || 0) - new Date(a.created_at || a.order_date || 0));
      setOrders(list);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const openOrderModal = (ord) => {
    setSelectedOrder(ord);
    setNewStatus((ord.order_status || ord.status || 'pending').toLowerCase());
    setTrackingNumber(ord.tracking_number || ord.tracking_id || '');
    setErrorMsg('');
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setUpdating(true);
    setErrorMsg('');
    try {
      const payload = {
        status: newStatus,
        tracking_number: trackingNumber,
        tracking_id: trackingNumber,
        carrier: selectedOrder.carrier || (trackingNumber ? 'Standard Courier' : '')
      };

      const res = await ordersApi.updateOrderStatus(selectedOrder.id, payload);
      
      const updatedOrder = res.order;
      if (updatedOrder) {
        setOrders(prev => prev.map(o => (String(o.id) === String(updatedOrder.id) ? updatedOrder : o)));
      }
      setSelectedOrder(null);
      showToast(res.message || `Order status updated to ${newStatus} successfully!`, 'success');
      await loadOrders();
    } catch (err) {
      console.error('Failed to update order status:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to update order status.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered': return 'success';
      case 'cancelled': return 'error';
      case 'shipped':
      case 'packed': return 'gold';
      default: return 'warning';
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = String(o.id).includes(search) ||
      (o.shipping_address?.city && o.shipping_address.city.toLowerCase().includes(search.toLowerCase())) ||
      (o.shipping_city && o.shipping_city.toLowerCase().includes(search.toLowerCase())) ||
      (o.user?.email && o.user.email.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = !statusFilter || o.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout role="owner" activeNav="orders">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.875rem', color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
          Patron Orders & Fulfillment
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.95rem' }}>
          Oversee order lifecycles, assign tracking numbers, and update dispatch milestones
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        backgroundColor: 'var(--color-white)',
        padding: '16px 20px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
          <Search size={18} color="var(--color-text-secondary)" />
          <input
            type="text"
            placeholder="Search by Order ID, destination city, patron..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="var(--color-text-secondary)" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              fontSize: '0.85rem',
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-white)'
            }}
          >
            <option value="">All Fulfillment Statuses</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div style={{
        backgroundColor: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {loading ? (
          <div style={{ padding: '48px 0' }}>
            <LoadingSpinner text="Retrieving orders..." />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <ShoppingBag size={40} color="var(--color-border)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ margin: '0 0 6px 0', color: 'var(--color-text-primary)' }}>No orders found</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Try adjusting your search query or filter.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-warm-cream)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Order ID</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Customer</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Date</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Shipping Destination</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Total</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Payment</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Fulfillment</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord) => {
                  const city = ord.shipping_address?.city || ord.shipping_city || 'India';
                  const custName = ord.customer_name || ord.shipping_address?.full_name || ord.shipping_address?.name || ord.user?.name || ord.user_email || 'Customer';
                  const date = new Date(ord.created_at || ord.order_date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  return (
                    <tr key={ord.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        #{ord.order_id || ord.id}
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--color-text-primary)' }}>
                        <div style={{ fontWeight: 600 }}>{custName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                          {ord.customer_phone || ord.shipping_address?.phone || ord.user_email}
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--color-text-secondary)' }}>
                        {date}
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--color-text-primary)' }}>
                        <div>{city}</div>
                        {ord.shipping_address?.state && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{ord.shipping_address.state}</div>
                        )}
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--color-primary-terracotta)' }}>
                        ₹{Number(ord.total_amount).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {ord.payment_method || 'CASH_ON_DELIVERY'}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: ord.payment_status?.toUpperCase() === 'PAID' ? 'var(--color-success)' : '#D97706', fontWeight: 600 }}>
                          {ord.payment_status || 'PENDING'}
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <Badge variant={getStatusBadgeVariant(ord.order_status || ord.status)}>
                          {(ord.order_status || ord.status || 'PENDING').toUpperCase()}
                        </Badge>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <Button variant="outline" size="sm" icon={Eye} onClick={() => openOrderModal(ord)}>
                          Manage
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details & Status Modal */}
      {selectedOrder && (
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
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '32px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', margin: '0 0 4px 0', color: 'var(--color-text-primary)' }}>
                  Order #{selectedOrder.order_id || selectedOrder.id}
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  Placed on {new Date(selectedOrder.created_at || selectedOrder.order_date).toLocaleString('en-IN')}
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div style={{ padding: '12px', backgroundColor: '#FFEBEE', color: 'var(--color-error)', borderRadius: 'var(--radius-sm)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Customer Details & Payment Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: 'var(--color-warm-cream)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--color-primary-terracotta)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Customer Details
                </h4>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                  {selectedOrder.customer_name || selectedOrder.shipping_address?.full_name || selectedOrder.shipping_address?.name || 'Customer'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  Phone: {selectedOrder.customer_phone || selectedOrder.shipping_address?.mobile_number || selectedOrder.shipping_address?.phone || 'N/A'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  Email: {selectedOrder.user_email || 'N/A'}
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--color-warm-cream)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--color-primary-terracotta)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Payment Information
                </h4>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                  Method: <span style={{ fontWeight: 700 }}>{selectedOrder.payment_method || 'CASH_ON_DELIVERY'}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                  Payment Status: <span style={{ fontWeight: 600, color: selectedOrder.payment_status?.toUpperCase() === 'PAID' ? 'var(--color-success)' : '#D97706' }}>
                    {selectedOrder.payment_status || 'PENDING'}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                  Order Status: <span style={{ fontWeight: 600 }}>{selectedOrder.order_status || selectedOrder.status || 'Pending'}</span>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Delivery Address
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                {[
                  selectedOrder.shipping_address?.house_number,
                  selectedOrder.shipping_address?.street || selectedOrder.shipping_address?.address,
                  selectedOrder.shipping_address?.landmark,
                  selectedOrder.shipping_address?.city,
                  selectedOrder.shipping_address?.state,
                  selectedOrder.shipping_address?.pincode || selectedOrder.shipping_address?.postal_code
                ].filter(Boolean).join(', ')}
              </p>
            </div>

            {/* Order Items */}
            <div style={{ marginBottom: '24px', backgroundColor: 'var(--color-warm-cream)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>Ordered Handicrafts</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedOrder.items || selectedOrder.order_items || []).map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{it.quantity}x</span> {it.name || it.product?.name || it.product_name || `Craft #${it.product_id}`}
                      {it.seller_id && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
                          (Seller #{it.seller_id})
                        </span>
                      )}
                    </div>
                    <span style={{ fontWeight: 600 }}>₹{(Number(it.price || it.product?.price || 0) * it.quantity).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '12px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Total Amount:</span>
                <span style={{ color: 'var(--color-primary-terracotta)' }}>₹{Number(selectedOrder.total_amount).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Seller-Wise Payment Routing Breakdown */}
            {selectedOrder.seller_splits && selectedOrder.seller_splits.length > 0 && (
              <div style={{ marginBottom: '24px', backgroundColor: '#F3E5F5', border: '1px solid #CE93D8', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#4A148C', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Seller-Wise Payment Routing</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#E1BEE7' }}>
                    Multi-Database Split
                  </span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedOrder.seller_splits.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', backgroundColor: 'var(--color-white)', padding: '8px 12px', borderRadius: '4px' }}>
                      <div>
                        <span style={{ fontWeight: 700, color: '#4A148C' }}>{s.seller_name || `Seller #${s.seller_id}`}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginLeft: '6px' }}>
                          ({s.database_id || `DB${s.seller_id}`}) · {s.items_count} units
                        </span>
                        <div style={{ fontSize: '0.75rem', color: s.settlement_status === 'ready_for_transfer' ? '#2E7D32' : '#E65100', marginTop: '2px' }}>
                          Status: {s.settlement_status} {s.payment_account_id ? `· Acc: ${s.payment_account_id}` : ''}
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, color: '#4A148C' }}>₹{Number(s.amount).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status Update Form */}
            <form onSubmit={handleUpdateStatus} style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--color-text-primary)' }}>Update Fulfillment Stage</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-white)' }}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Carrier Tracking / AWB</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="e.g. INPOST-9821038"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <Button 
                  type="button" 
                  variant="outline" 
                  icon={Download}
                  onClick={() => adminApi.downloadInvoicePdf(selectedOrder.order_id || selectedOrder.id, selectedOrder.invoice_number)}
                >
                  Download Invoice PDF
                </Button>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <Button type="button" variant="outline" onClick={() => setSelectedOrder(null)}>
                    Close
                  </Button>
                  <Button type="submit" variant="primary" loading={updating}>
                    Update Milestone
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          backgroundColor: toast.type === 'error' ? 'var(--color-error)' : '#10B981',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
    </DashboardLayout>
  );
}
