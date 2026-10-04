import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Package, Clock, Truck, CheckCircle2, XCircle, 
  ChevronDown, ChevronUp, AlertCircle, ShoppingBag, Eye 
} from 'lucide-react';
import { ordersApi } from '../api/orders';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

const STATUS_STEPS = [
  { key: 'pending', label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' }
];

export default function Orders() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/account/orders');
      return;
    }
    loadOrders();
  }, [isAuthenticated]);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ordersApi.getAll();
      const list = res.orders || res || [];
      // Sort newest first
      list.sort((a, b) => new Date(b.created_at || b.order_date || 0) - new Date(a.created_at || a.order_date || 0));
      setOrders(list);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError('Unable to load your orders history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this artisanal order?')) return;
    setCancellingId(orderId);
    try {
      await ordersApi.cancel(orderId);
      await loadOrders();
    } catch (err) {
      console.error('Failed to cancel order:', err);
      alert(err.response?.data?.message || 'Unable to cancel this order.');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'error';
      case 'shipped':
      case 'out_for_delivery':
      case 'packed':
        return 'gold';
      default:
        return 'warning';
    }
  };

  const getStepProgress = (currentStatus) => {
    const s = currentStatus?.toLowerCase();
    if (s === 'cancelled') return -1;
    switch (s) {
      case 'pending': return 0;
      case 'confirmed': return 1;
      case 'packed': return 2;
      case 'shipped':
      case 'out_for_delivery':
      case 'out for delivery': return 3;
      case 'delivered': return 4;
      default: return 0;
    }
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return <LoadingSpinner text="Retrieving your artisanal orders..." fullScreen />;
  }

  return (
    <div style={{ backgroundColor: 'var(--color-warm-cream)', minHeight: '100vh', padding: '40px 0 80px' }}>
      <div className="container">
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
          My Craft Orders
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px' }}>
          Track the journey of your authentic handcrafted creations
        </p>

        {error && (
          <div style={{
            padding: '16px',
            backgroundColor: '#FFEBEE',
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-error)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No Orders Yet"
            message="You haven't placed any handicraft orders yet. Support rural artisans by exploring our heritage collections."
            actionLabel="Discover Handicrafts"
            onAction={() => navigate('/products')}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {orders.map((order) => {
              const isExpanded = expandedOrderId === order.id;
              const stepIndex = getStepProgress(order.status);
              const isCancelled = order.status?.toLowerCase() === 'cancelled';
              const items = order.items || order.order_items || [];

              return (
                <div
                  key={order.id}
                  style={{
                    backgroundColor: 'var(--color-white)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-border)',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  {/* Order Card Header */}
                  <div style={{
                    padding: '20px 24px',
                    backgroundColor: 'var(--color-warm-cream)',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                        ORDER PLACED
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {new Date(order.created_at || order.order_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                        TOTAL AMOUNT
                      </div>
                      <div style={{ fontWeight: 700, color: 'var(--color-primary-terracotta)' }}>
                        ₹{Number(order.total_amount).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                        SHIP TO
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                        {order.shipping_address?.city || order.shipping_city || 'India'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
                      <Badge variant={getStatusBadgeVariant(order.status)}>
                        {order.status?.toUpperCase() || 'PENDING'}
                      </Badge>
                      <button
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.85rem'
                        }}
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Order Tracking Timeline */}
                  {!isCancelled ? (
                    <div style={{ padding: '24px', borderBottom: '1px solid var(--color-border)', backgroundColor: '#FAFAFA' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
                        {/* Connecting track line */}
                        <div style={{
                          position: 'absolute',
                          top: '14px',
                          left: '10%',
                          right: '10%',
                          height: '3px',
                          backgroundColor: 'var(--color-border)',
                          zIndex: 0
                        }}>
                          <div style={{
                            width: `${(stepIndex / (STATUS_STEPS.length - 1)) * 100}%`,
                            height: '100%',
                            backgroundColor: 'var(--color-success)',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>

                        {STATUS_STEPS.map((st, idx) => {
                          const isDone = idx <= stepIndex;
                          const isCurrent = idx === stepIndex;
                          return (
                            <div key={st.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, position: 'relative' }}>
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                backgroundColor: isDone ? 'var(--color-success)' : 'var(--color-white)',
                                border: isDone ? '2px solid var(--color-success)' : '2px solid var(--color-border)',
                                color: isDone ? 'var(--color-white)' : 'var(--color-text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                marginBottom: '6px'
                              }}>
                                {isDone ? '✓' : idx + 1}
                              </div>
                              <span style={{ 
                                fontSize: '0.75rem', 
                                color: isCurrent ? 'var(--color-primary-terracotta)' : isDone ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                                fontWeight: isCurrent ? 700 : 500
                              }}>
                                {st.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '16px 24px', backgroundColor: '#FFF5F5', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-error)', fontSize: '0.9rem' }}>
                      <XCircle size={18} />
                      <span>This order has been cancelled. If payment was made, your refund is being processed.</span>
                    </div>
                  )}

                  {/* Order Items List */}
                  <div style={{ padding: '24px' }}>
                    {/* Carrier & Tracking Banner if Dispatched */}
                    {(order.tracking_id || order.tracking_number) && (
                      <div style={{
                        marginBottom: '20px',
                        padding: '12px 18px',
                        backgroundColor: '#F0F9FF',
                        border: '1px solid #BAE6FD',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px',
                        fontSize: '0.85rem',
                        color: '#0369A1'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Truck size={18} color="#0284C7" />
                          <span>Fulfillment Carrier: <strong style={{ color: '#0C4A6E' }}>{order.carrier || 'Indian Postal / Courier'}</strong></span>
                        </div>
                        <div>
                          <span>Tracking / AWB Number: <strong style={{ color: '#0C4A6E', letterSpacing: '0.5px' }}>{order.tracking_id || order.tracking_number}</strong></span>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {items.map((item, idx) => {
                        const product = item.product || {};
                        const pName = product.name || item.product_name || `Craft Item #${item.product_id}`;
                        const pImg = product.image_url || product.image || '/placeholder.png';
                        const pPrice = item.price || product.price || 0;

                        return (
                          <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <div style={{
                              width: '64px',
                              height: '64px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'var(--color-soft-beige)',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid var(--color-border)',
                              flexShrink: 0
                            }}>
                              <img src={pImg} alt={pName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{pName}</div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                Quantity: {item.quantity} • ₹{Number(pPrice).toLocaleString('en-IN')} each
                              </div>
                            </div>
                            <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                              ₹{(Number(pPrice) * item.quantity).toLocaleString('en-IN')}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Expanded Details: Address, Payment, Tracking & Milestones */}
                    {isExpanded && (
                      <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                          <div>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>Delivery Destination</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                              {order.shipping_address?.street || order.shipping_street || 'Delivery Address'}<br />
                              {order.shipping_address?.city || order.shipping_city}, {order.shipping_address?.state || order.shipping_state} {order.shipping_address?.postal_code || order.shipping_postal_code}
                            </p>
                          </div>
                          <div>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>Payment Details</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                              Mode: <strong>{order.payment_method?.toUpperCase() || 'COD'}</strong><br />
                              Status: <span style={{
                                fontWeight: 700,
                                color: order.payment_status?.toUpperCase() === 'PAID' ? 'var(--color-success)' : '#D97706'
                              }}>
                                {order.payment_status || 'PENDING'}
                              </span>
                            </p>
                          </div>
                          <div>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>Dispatch & Carrier Info</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                              Carrier: <strong>{order.carrier || 'Indian Postal / Courier'}</strong><br />
                              Tracking / AWB: <strong style={{ color: 'var(--color-primary-terracotta)' }}>{order.tracking_id || order.tracking_number || 'Awaiting Dispatch'}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Status Timeline History */}
                        {order.tracking_history && order.tracking_history.length > 0 && (
                          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed var(--color-border)' }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--color-primary-terracotta)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Fulfillment Milestone History
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {order.tracking_history.map((th, thIdx) => (
                                <div key={thIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success)', flexShrink: 0 }} />
                                  <strong style={{ color: 'var(--color-text-primary)' }}>{th.status}</strong>
                                  <span>— {th.message || 'Milestone recorded'}</span>
                                  {th.tracking_id && <span style={{ color: '#0369A1' }}>({th.tracking_id})</span>}
                                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                    {th.updated_at ? new Date(th.updated_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions bar */}
                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                      {(!isCancelled && (order.status === 'pending' || order.status === 'confirmed')) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelOrder(order.id)}
                          loading={cancellingId === order.id}
                          style={{ color: 'var(--color-error)' }}
                        >
                          Cancel Order
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/products')}
                      >
                        Buy Similar Crafts
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
