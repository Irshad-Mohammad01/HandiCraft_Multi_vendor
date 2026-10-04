import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Package, Truck, CheckCircle2, 
  AlertCircle, Eye, Search, Filter, X 
} from 'lucide-react';
import { ordersApi } from '../../api/orders';
import { productsApi } from '../../api/products';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import MetricCard from '../../components/dashboard/MetricCard';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'packed', label: 'Packed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' }
];

export default function SubOwnerDashboard() {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'inventory'
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Selected Order for milestone update
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [updating, setUpdating] = useState(false);
  const [modalError, setModalError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    loadOperationalData();
  }, []);

  const loadOperationalData = async () => {
    setLoading(true);
    try {
      const [ordRes, prodRes] = await Promise.allSettled([
        ordersApi.getAll(),
        productsApi.getAll({ all: 'true' })
      ]);

      if (ordRes.status === 'fulfilled') {
        const list = ordRes.value.orders || ordRes.value || [];
        list.sort((a, b) => new Date(b.created_at || b.order_date || 0) - new Date(a.created_at || a.order_date || 0));
        setOrders(list);
      }
      if (prodRes.status === 'fulfilled') {
        setProducts(prodRes.value.products || prodRes.value || []);
      }
    } catch (err) {
      console.error('Error loading sub-owner data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openOrderModal = (ord) => {
    setSelectedOrder(ord);
    setNewStatus((ord.order_status || ord.status || 'pending').toLowerCase());
    setTrackingNumber(ord.tracking_number || ord.tracking_id || '');
    setModalError('');
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setUpdating(true);
    setModalError('');
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
      showToast(res.message || `Milestone updated to ${newStatus} successfully!`, 'success');
      await loadOperationalData();
    } catch (err) {
      console.error('Failed to update order milestone:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to update order milestone';
      setModalError(msg);
      showToast(msg, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed');
  const dispatchedOrders = orders.filter(o => o.status === 'shipped' || o.status === 'packed');
  const lowStock = products.filter(p => p.stock !== undefined && p.stock <= 5);

  const filteredOrders = orders.filter(o =>
    String(o.id).includes(search) ||
    (o.shipping_address?.city && o.shipping_address.city.toLowerCase().includes(search.toLowerCase())) ||
    (o.shipping_city && o.shipping_city.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout role="sub_owner" activeNav="dashboard">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.875rem', color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
          Operations & Fulfillment Workspace
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '0.95rem' }}>
          Sub-Owner operational controls: Process patron shipments, update packaging statuses, and audit artisan inventory
        </p>
      </div>

      {/* Operational Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <MetricCard
          title="Orders Pending Packaging"
          value={pendingOrders.length}
          icon={ShoppingBag}
          trend="Awaiting dispatch prep"
        />
        <MetricCard
          title="In Transit / Dispatched"
          value={dispatchedOrders.length}
          icon={Truck}
          trend="Carrier en route"
        />
        <MetricCard
          title="Stock Alerts"
          value={lowStock.length}
          icon={Package}
          trend="Critical craft quantities"
        />
      </div>

      {/* Operational Tabs */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: '12px'
      }}>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            backgroundColor: activeTab === 'orders' ? 'var(--color-primary-terracotta)' : 'var(--color-soft-beige)',
            color: activeTab === 'orders' ? 'var(--color-white)' : 'var(--color-text-primary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Fulfillment Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            backgroundColor: activeTab === 'inventory' ? 'var(--color-primary-terracotta)' : 'var(--color-soft-beige)',
            color: activeTab === 'inventory' ? 'var(--color-white)' : 'var(--color-text-primary)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Stock Inspection ({products.length})
        </button>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading operational workspace..." />
      ) : activeTab === 'orders' ? (
        <div>
          {/* Orders Table */}
          <div style={{
            backgroundColor: 'var(--color-white)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-warm-cream)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Order ID</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Customer</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Date</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Destination</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Total Amount</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Payment</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Status</th>
                    <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((ord) => {
                    const custName = ord.customer_name || ord.shipping_address?.full_name || ord.shipping_address?.name || ord.user?.name || ord.user_email || 'Customer';
                    const amount = ord.seller_total_amount !== undefined ? ord.seller_total_amount : ord.total_amount;
                    return (
                      <tr key={ord.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '16px 20px', fontWeight: 600 }}>#{ord.order_id || ord.id}</td>
                        <td style={{ padding: '16px 20px', color: 'var(--color-text-primary)' }}>
                          <div style={{ fontWeight: 600 }}>{custName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                            {ord.customer_phone || ord.shipping_address?.phone || ord.user_email}
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--color-text-secondary)' }}>
                          {new Date(ord.created_at || ord.order_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--color-text-primary)' }}>
                          <div>{ord.shipping_address?.city || ord.shipping_city || 'India'}</div>
                          {ord.shipping_address?.state && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{ord.shipping_address.state}</div>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--color-primary-terracotta)' }}>
                          ₹{Number(amount).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {ord.payment_method || 'CASH_ON_DELIVERY'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: ord.payment_status?.toUpperCase() === 'PAID' ? 'var(--color-success)' : '#D97706', fontWeight: 600 }}>
                            {ord.payment_status || 'PENDING'}
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <Badge variant={ord.order_status?.toLowerCase() === 'delivered' ? 'success' : ord.order_status?.toLowerCase() === 'cancelled' ? 'error' : 'warning'}>
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
          </div>
        </div>
      ) : (
        /* Inventory Tab */
        <div style={{
          backgroundColor: 'var(--color-white)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-warm-cream)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Craft Item</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Price</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Current Stock</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Stock Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {p.name}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--color-primary-terracotta)', fontWeight: 600 }}>
                      ₹{Number(p.price).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>
                      {p.stock} units
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <Badge variant={p.stock > 5 ? 'success' : p.stock > 0 ? 'warning' : 'error'}>
                        {p.stock > 5 ? 'In Stock' : p.stock > 0 ? 'Low Stock' : 'Out of Stock'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub Owner Milestone Update Modal */}
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
            maxWidth: '640px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '32px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', margin: 0, color: 'var(--color-text-primary)' }}>
                  Order #{selectedOrder.order_id || selectedOrder.id}
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  Placed on {new Date(selectedOrder.created_at || selectedOrder.order_date).toLocaleString('en-IN')}
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div style={{ padding: '12px', backgroundColor: '#FFEBEE', color: 'var(--color-error)', borderRadius: 'var(--radius-sm)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            {/* Customer & Payment Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ backgroundColor: 'var(--color-warm-cream)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary-terracotta)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Customer Details
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                  {selectedOrder.customer_name || selectedOrder.shipping_address?.full_name || selectedOrder.shipping_address?.name || 'Customer'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  Phone: {selectedOrder.customer_phone || selectedOrder.shipping_address?.phone || selectedOrder.user_email || 'N/A'}
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--color-warm-cream)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary-terracotta)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Payment Details
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                  Method: <span style={{ fontWeight: 600 }}>{selectedOrder.payment_method || 'CASH_ON_DELIVERY'}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                  Status: <span style={{ fontWeight: 600, color: selectedOrder.payment_status?.toUpperCase() === 'PAID' ? 'var(--color-success)' : '#D97706' }}>
                    {selectedOrder.payment_status || 'PENDING'}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div style={{ marginBottom: '16px', padding: '14px', backgroundColor: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Delivery Address
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
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

            {/* Ordered Items */}
            <div style={{ marginBottom: '20px', backgroundColor: 'var(--color-warm-cream)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary-terracotta)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Ordered Products
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(selectedOrder.items || selectedOrder.order_items || []).map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>{it.quantity}x {it.name || it.product?.name || `Craft #${it.product_id}`}</span>
                    <span style={{ fontWeight: 600 }}>₹{(Number(it.price || it.product?.price || 0) * it.quantity).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleUpdateStatus}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Dispatch Milestone</label>
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

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Courier / AWB Tracking Number</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. BLUEDART-104928"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <Button type="button" variant="outline" onClick={() => setSelectedOrder(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={updating}>
                  Confirm Milestone
                </Button>
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
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
    </DashboardLayout>
  );
}
