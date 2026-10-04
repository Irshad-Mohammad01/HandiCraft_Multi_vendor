import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  ShieldCheck, MapPin, CreditCard, CheckCircle2, 
  ChevronRight, AlertCircle, Plus, Truck, ArrowLeft,
  Edit2, Trash2, Check
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ordersApi } from '../api/orders';
import { authApi } from '../api/auth';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';

const EMPTY_ADDRESS_FORM = {
  full_name: '',
  mobile_number: '',
  house_number: '',
  street: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  address_type: 'Home',
  is_default: false
};

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems, getSubtotal, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();

  const [step, setStep] = useState(1); // 1: Delivery Address, 2: Payment & Review, 3: Confirmation
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressErrors, setAddressErrors] = useState({});
  const [addressSuccessMsg, setAddressSuccessMsg] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  // Address form state
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);

  const subtotal = getSubtotal();
  const shipping = subtotal >= 999 || subtotal === 0 ? 0 : 99;
  const appliedCoupon = location.state?.appliedCoupon || null;
  const discountAmount = location.state?.discountAmount || 0;
  const totalAmount = Math.max(0, subtotal - discountAmount + shipping);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout', { state: { from: { pathname: '/checkout' } } });
      return;
    }
    if (cartItems.length === 0 && !confirmedOrder) {
      navigate('/cart');
      return;
    }
    loadAddresses();
  }, [isAuthenticated, cartItems.length, confirmedOrder]);

  const loadAddresses = async (preferredSelectedId = null) => {
    setLoadingAddresses(true);
    try {
      const res = await authApi.getAddresses();
      const list = res.addresses || res || [];
      setAddresses(list);

      if (list.length > 0) {
        if (preferredSelectedId && list.some(a => a.id === preferredSelectedId)) {
          setSelectedAddressId(preferredSelectedId);
        } else {
          const def = list.find(a => a.is_default) || list[0];
          setSelectedAddressId(def.id);
        }
      } else {
        setSelectedAddressId(null);
      }
    } catch (err) {
      console.error('Failed to load user addresses:', err);
      setAddresses([]);
      setSelectedAddressId(null);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const validateAddressForm = () => {
    const errors = {};
    if (!addressForm.full_name || !addressForm.full_name.trim()) {
      errors.full_name = 'Full Name is required.';
    }
    const cleanMobile = (addressForm.mobile_number || '').trim();
    if (!cleanMobile) {
      errors.mobile_number = 'Mobile Number is required.';
    } else if (!/^\d{10}$/.test(cleanMobile)) {
      errors.mobile_number = 'Please enter a valid 10-digit mobile number.';
    }
    if (!addressForm.house_number || !addressForm.house_number.trim()) {
      errors.house_number = 'House / Flat / Building Number is required.';
    }
    if (!addressForm.street || !addressForm.street.trim()) {
      errors.street = 'Street / Area / Locality is required.';
    }
    if (!addressForm.city || !addressForm.city.trim()) {
      errors.city = 'City is required.';
    }
    if (!addressForm.state || !addressForm.state.trim()) {
      errors.state = 'State is required.';
    }
    const cleanPin = (addressForm.pincode || '').trim();
    if (!cleanPin) {
      errors.pincode = 'PIN Code is required.';
    } else if (!/^\d{6}$/.test(cleanPin)) {
      errors.pincode = 'Please enter a valid 6-digit PIN code.';
    }

    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenAddForm = () => {
    setEditingAddressId(null);
    setAddressForm({
      ...EMPTY_ADDRESS_FORM,
      full_name: user?.name || '',
      mobile_number: user?.phone || ''
    });
    setAddressErrors({});
    setShowAddressForm(true);
  };

  const handleOpenEditForm = (addr, e) => {
    e.stopPropagation();
    setEditingAddressId(addr.id);
    setAddressForm({
      full_name: addr.full_name || addr.name || '',
      mobile_number: addr.mobile_number || addr.phone || '',
      house_number: addr.house_number || addr.house || '',
      street: addr.street || addr.address || '',
      landmark: addr.landmark || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || addr.postal_code || '',
      address_type: addr.address_type || 'Home',
      is_default: Boolean(addr.is_default)
    });
    setAddressErrors({});
    setShowAddressForm(true);
  };

  const handleCancelAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddressId(null);
    setAddressForm(EMPTY_ADDRESS_FORM);
    setAddressErrors({});
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!validateAddressForm()) {
      return;
    }

    setSavingAddress(true);
    setOrderError('');
    try {
      const payload = {
        full_name: addressForm.full_name.trim(),
        name: addressForm.full_name.trim(),
        mobile_number: addressForm.mobile_number.trim(),
        phone: addressForm.mobile_number.trim(),
        house_number: addressForm.house_number.trim(),
        street: addressForm.street.trim(),
        area: addressForm.street.trim(),
        landmark: (addressForm.landmark || '').trim(),
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        pincode: addressForm.pincode.trim(),
        postal_code: addressForm.pincode.trim(),
        country: 'India',
        address_type: addressForm.address_type || 'Home',
        is_default: addresses.length === 0 ? true : Boolean(addressForm.is_default)
      };

      let savedAddrId = null;
      if (editingAddressId) {
        const res = await authApi.updateAddress(editingAddressId, payload);
        savedAddrId = res.address?.id || editingAddressId;
        setAddressSuccessMsg('Delivery address updated successfully.');
      } else {
        const res = await authApi.addAddress(payload);
        savedAddrId = res.address?.id || res.id;
        setAddressSuccessMsg('Delivery address saved successfully.');
      }

      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm(EMPTY_ADDRESS_FORM);
      setAddressErrors({});

      await loadAddresses(savedAddrId);
      setTimeout(() => setAddressSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error saving address:', err);
      const msg = err.response?.data?.message || 'Unable to save address. Please check all required fields.';
      setAddressErrors({ submit: msg });
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSetDefaultAddress = async (addrId, e) => {
    e.stopPropagation();
    try {
      await authApi.setDefaultAddress(addrId);
      setAddresses(prev => prev.map(a => ({
        ...a,
        is_default: a.id === addrId
      })));
      setSelectedAddressId(addrId);
    } catch (err) {
      console.error('Error setting default address:', err);
    }
  };

  const handleDeleteAddress = async (addrId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this delivery address?')) {
      return;
    }
    try {
      await authApi.deleteAddress(addrId);
      const remaining = addresses.filter(a => a.id !== addrId);
      setAddresses(remaining);
      if (selectedAddressId === addrId) {
        const nextDef = remaining.find(a => a.is_default) || remaining[0];
        setSelectedAddressId(nextDef ? nextDef.id : null);
      }
    } catch (err) {
      console.error('Error deleting address:', err);
      alert('Failed to delete address.');
    }
  };

  const handlePlaceOrder = async () => {
    if (submittingOrder) return;

    if (!selectedAddressId && addresses.length === 0) {
      setOrderError('No delivery address found. Please add your delivery address to continue.');
      setStep(1);
      return;
    }

    setSubmittingOrder(true);
    setOrderError('');

    try {
      const selectedAddr = addresses.find(a => a.id === selectedAddressId) || addresses[0];
      if (!selectedAddr) {
        setOrderError('Please select a valid delivery address.');
        setStep(1);
        setSubmittingOrder(false);
        return;
      }

      const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const payload = {
        selected_address_id: selectedAddr.id,
        shipping_address: {
          full_name: selectedAddr.full_name || selectedAddr.name || user?.name || 'Customer',
          name: selectedAddr.full_name || selectedAddr.name || user?.name || 'Customer',
          mobile_number: selectedAddr.mobile_number || selectedAddr.phone || user?.phone || '',
          phone: selectedAddr.mobile_number || selectedAddr.phone || user?.phone || '',
          house_number: selectedAddr.house_number || '',
          street: selectedAddr.street || '',
          area: selectedAddr.area || selectedAddr.street || '',
          landmark: selectedAddr.landmark || '',
          city: selectedAddr.city || '',
          state: selectedAddr.state || '',
          pincode: selectedAddr.pincode || selectedAddr.postal_code || '',
          postal_code: selectedAddr.pincode || selectedAddr.postal_code || '',
          country: selectedAddr.country || 'India',
          address_type: selectedAddr.address_type || 'Home',
          email: user?.email || ''
        },
        items: cartItems.map(item => ({
          product_id: item.product_id || item.product?.id || item.id,
          quantity: item.quantity || 1,
          price: item.product?.price || item.price
        })),
        payment_method: paymentMethod === 'cod' ? 'CASH_ON_DELIVERY' : 'ONLINE',
        terms_accepted: true,
        coupon_code: appliedCoupon ? appliedCoupon.code : null,
        total_amount: totalAmount,
        idempotency_key: idempotencyKey
      };

      const res = await ordersApi.create(payload, { 'Idempotency-Key': idempotencyKey });
      const createdOrder = res.order || res;

      // Handle Online Payment Routing
      if (paymentMethod === 'online' && res.payment) {
        const paymentData = res.payment;
        if (window.Razorpay && paymentData.key_id && !paymentData.key_id.includes('sandbox')) {
          const options = {
            key: paymentData.key_id,
            amount: Math.round(paymentData.amount * 100),
            currency: paymentData.currency || 'INR',
            name: 'CraftNest Marketplace',
            description: `Order #${createdOrder.order_id}`,
            order_id: paymentData.gateway_order_id,
            handler: async function (response) {
              try {
                await ordersApi.verifyPayment({
                  order_id: createdOrder.order_id || createdOrder.id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                });
                setConfirmedOrder(createdOrder);
                clearCart();
                navigate('/order-success', { state: { order: createdOrder, payment: response }, replace: true });
              } catch (verifyErr) {
                console.error('Payment verification failed:', verifyErr);
                setOrderError('Payment verification failed on server. Please check your bank or contact support.');
              }
            },
            prefill: {
              name: selectedAddr.full_name || user?.name,
              email: user?.email,
              contact: selectedAddr.mobile_number || user?.phone
            },
            theme: { color: '#C86D51' }
          };
          const rzp = new window.Razorpay(options);
          rzp.open();
          setSubmittingOrder(false);
          return;
        } else {
          // Dev / Sandbox simulated gateway confirmation via server verification
          try {
            await ordersApi.verifyPayment({
              order_id: createdOrder.order_id || createdOrder.id,
              razorpay_order_id: paymentData.gateway_order_id || `order_dev_${Date.now()}`,
              razorpay_payment_id: `pay_dev_${Date.now()}`,
              razorpay_signature: `sig_dev_${Date.now()}`
            });
          } catch (verifyErr) {
            console.warn('[DEV PAYMENT VERIFY WARN]:', verifyErr);
          }
        }
      }

      setConfirmedOrder(createdOrder);
      clearCart();
      navigate('/order-success', { state: { order: createdOrder }, replace: true });
    } catch (err) {
      console.error('Order creation failed:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to place order. Please review your details and try again.';
      setOrderError(errorMsg);
    } finally {
      setSubmittingOrder(false);
    }
  };

  const formatAddressString = (addr) => {
    if (!addr) return '';
    const parts = [
      addr.house_number || addr.house,
      addr.street || addr.address,
      addr.landmark,
      addr.city,
      addr.state,
      addr.pincode || addr.postal_code
    ].filter(Boolean);
    return parts.join(', ');
  };

  if (!isAuthenticated) return null;

  return (
    <div style={{ backgroundColor: 'var(--color-warm-cream)', minHeight: '100vh', padding: '40px 0 80px' }}>
      <div className="container" style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 16px' }}>
        
        {/* Step Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          marginBottom: '36px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            color: step >= 1 ? 'var(--color-primary-terracotta)' : 'var(--color-text-secondary)',
            fontWeight: 600
          }}>
            <span style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: step >= 1 ? 'var(--color-primary-terracotta)' : 'var(--color-border)',
              color: 'var(--color-white)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem'
            }}>1</span>
            <span>Delivery Address</span>
          </div>

          <div style={{ width: '40px', height: '2px', backgroundColor: step >= 2 ? 'var(--color-primary-terracotta)' : 'var(--color-border)' }} />

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            color: step >= 2 ? 'var(--color-primary-terracotta)' : 'var(--color-text-secondary)',
            fontWeight: 600
          }}>
            <span style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: step >= 2 ? 'var(--color-primary-terracotta)' : 'var(--color-border)',
              color: 'var(--color-white)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem'
            }}>2</span>
            <span>Payment & Review</span>
          </div>

          <div style={{ width: '40px', height: '2px', backgroundColor: step === 3 ? 'var(--color-primary-terracotta)' : 'var(--color-border)' }} />

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            color: step === 3 ? 'var(--color-primary-terracotta)' : 'var(--color-text-secondary)',
            fontWeight: 600
          }}>
            <span style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: step === 3 ? 'var(--color-primary-terracotta)' : 'var(--color-border)',
              color: 'var(--color-white)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem'
            }}>3</span>
            <span>Confirmation</span>
          </div>
        </div>

        {/* Global Notifications */}
        {orderError && (
          <div style={{
            maxWidth: '800px',
            margin: '0 auto 24px',
            padding: '14px 18px',
            backgroundColor: '#FFEBEE',
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-error)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem'
          }}>
            <AlertCircle size={20} />
            <span>{orderError}</span>
          </div>
        )}

        {addressSuccessMsg && (
          <div style={{
            maxWidth: '800px',
            margin: '0 auto 24px',
            padding: '12px 18px',
            backgroundColor: '#E8F5E9',
            border: '1px solid var(--color-success)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-success)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem'
          }}>
            <CheckCircle2 size={18} />
            <span>{addressSuccessMsg}</span>
          </div>
        )}

        {/* ==========================================================
            STEP 1: Delivery Address Management
            ========================================================== */}
        {step === 1 && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{
              backgroundColor: 'var(--color-white)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              padding: '32px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', margin: 0, color: 'var(--color-text-primary)' }}>
                  Delivery Address
                </h2>
                {addresses.length > 0 && !showAddressForm && (
                  <Button 
                    variant="outline" 
                    icon={Plus} 
                    size="sm"
                    onClick={handleOpenAddForm}
                  >
                    Add New Address
                  </Button>
                )}
              </div>

              {loadingAddresses ? (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                  <LoadingSpinner text="Fetching your delivery addresses..." />
                </div>
              ) : (
                <div>
                  {/* Empty state: customer has no addresses */}
                  {addresses.length === 0 && !showAddressForm && (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px 24px',
                      backgroundColor: 'var(--color-warm-cream)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px dashed var(--color-border)',
                      marginBottom: '24px'
                    }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-soft-beige)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px'
                      }}>
                        <MapPin size={28} color="var(--color-primary-terracotta)" />
                      </div>
                      <h4 style={{ margin: '0 0 8px', color: 'var(--color-text-primary)', fontSize: '1.1rem' }}>
                        No delivery address found
                      </h4>
                      <p style={{ margin: '0 0 20px', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                        No delivery address found. Please add your delivery address to continue.
                      </p>
                      <Button 
                        variant="primary" 
                        icon={Plus} 
                        onClick={handleOpenAddForm}
                      >
                        Add New Delivery Address
                      </Button>
                    </div>
                  )}

                  {/* Saved Addresses List */}
                  {addresses.length > 0 && !showAddressForm && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                      {addresses.map((addr) => {
                        const isSelected = selectedAddressId === addr.id;
                        const addressText = formatAddressString(addr);

                        return (
                          <div
                            key={addr.id}
                            onClick={() => setSelectedAddressId(addr.id)}
                            style={{
                              padding: '20px',
                              borderRadius: 'var(--radius-md)',
                              border: isSelected ? '2px solid var(--color-primary-terracotta)' : '1px solid var(--color-border)',
                              backgroundColor: isSelected ? 'var(--color-warm-cream)' : 'var(--color-white)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              position: 'relative'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                  type="radio"
                                  name="selectedAddress"
                                  checked={isSelected}
                                  onChange={() => setSelectedAddressId(addr.id)}
                                  style={{ accentColor: 'var(--color-primary-terracotta)', width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-primary)' }}>
                                  {addr.full_name || addr.name || user?.name || 'Customer'}
                                </span>
                                <span style={{
                                  fontSize: '0.75rem',
                                  backgroundColor: 'var(--color-soft-beige)',
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-full)',
                                  color: 'var(--color-text-primary)',
                                  textTransform: 'uppercase',
                                  fontWeight: 600
                                }}>
                                  {addr.address_type || 'Home'}
                                </span>
                                {addr.is_default && (
                                  <span style={{ 
                                    fontSize: '0.75rem', 
                                    backgroundColor: '#E8F5E9', 
                                    padding: '2px 8px', 
                                    borderRadius: 'var(--radius-full)',
                                    color: 'var(--color-success)',
                                    fontWeight: 600
                                  }}>
                                    Default
                                  </span>
                                )}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {!addr.is_default && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleSetDefaultAddress(addr.id, e)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--color-primary-terracotta)',
                                      fontSize: '0.8rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      padding: '4px 8px'
                                    }}
                                  >
                                    Set as Default
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenEditForm(addr, e)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-text-secondary)',
                                    cursor: 'pointer',
                                    padding: '4px'
                                  }}
                                  title="Edit address"
                                  aria-label="Edit address"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteAddress(addr.id, e)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-error)',
                                    cursor: 'pointer',
                                    padding: '4px'
                                  }}
                                  title="Delete address"
                                  aria-label="Delete address"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>

                            <p style={{ margin: '0 0 8px 28px', fontSize: '0.9rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                              {addressText}
                            </p>

                            <div style={{ margin: '0 0 0 28px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                              Mobile: <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{addr.mobile_number || addr.phone || user?.phone || 'Not provided'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add / Edit Address Form */}
                  {showAddressForm && (
                    <form 
                      onSubmit={handleSaveAddress} 
                      style={{
                        backgroundColor: 'var(--color-warm-cream)',
                        padding: '28px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        marginBottom: '24px'
                      }}
                    >
                      <h4 style={{ margin: '0 0 20px 0', color: 'var(--color-text-primary)', fontFamily: 'Playfair Display, serif', fontSize: '1.25rem' }}>
                        {editingAddressId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
                      </h4>

                      {addressErrors.submit && (
                        <div style={{
                          marginBottom: '16px',
                          padding: '10px 14px',
                          backgroundColor: '#FFEBEE',
                          border: '1px solid var(--color-error)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--color-error)',
                          fontSize: '0.85rem'
                        }}>
                          {addressErrors.submit}
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                        {/* Full Name */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                            Full Name <span style={{ color: 'var(--color-error)' }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={addressForm.full_name}
                            onChange={(e) => setAddressForm({ ...addressForm, full_name: e.target.value })}
                            placeholder="Enter full name"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: 'var(--radius-sm)',
                              border: addressErrors.full_name ? '1px solid var(--color-error)' : '1px solid var(--color-border)',
                              fontSize: '0.9rem'
                            }}
                          />
                          {addressErrors.full_name && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>
                              {addressErrors.full_name}
                            </span>
                          )}
                        </div>

                        {/* Mobile Number */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                            Mobile Number <span style={{ color: 'var(--color-error)' }}>*</span>
                          </label>
                          <input
                            type="tel"
                            maxLength={10}
                            value={addressForm.mobile_number}
                            onChange={(e) => setAddressForm({ ...addressForm, mobile_number: e.target.value.replace(/\D/g, '') })}
                            placeholder="10-digit mobile number"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: 'var(--radius-sm)',
                              border: addressErrors.mobile_number ? '1px solid var(--color-error)' : '1px solid var(--color-border)',
                              fontSize: '0.9rem'
                            }}
                          />
                          {addressErrors.mobile_number && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>
                              {addressErrors.mobile_number}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                        {/* House / Flat / Building Number */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                            House / Flat / Building Number <span style={{ color: 'var(--color-error)' }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={addressForm.house_number}
                            onChange={(e) => setAddressForm({ ...addressForm, house_number: e.target.value })}
                            placeholder="e.g. Flat 302, Green Heights"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: 'var(--radius-sm)',
                              border: addressErrors.house_number ? '1px solid var(--color-error)' : '1px solid var(--color-border)',
                              fontSize: '0.9rem'
                            }}
                          />
                          {addressErrors.house_number && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>
                              {addressErrors.house_number}
                            </span>
                          )}
                        </div>

                        {/* Street / Area / Locality */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                            Street / Area / Locality <span style={{ color: 'var(--color-error)' }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={addressForm.street}
                            onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                            placeholder="e.g. MG Road, Civil Lines"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: 'var(--radius-sm)',
                              border: addressErrors.street ? '1px solid var(--color-error)' : '1px solid var(--color-border)',
                              fontSize: '0.9rem'
                            }}
                          />
                          {addressErrors.street && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>
                              {addressErrors.street}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                        {/* Landmark (Optional) */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                            Landmark <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 400 }}>(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={addressForm.landmark}
                            onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                            placeholder="e.g. Near City Post Office"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--color-border)',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>

                        {/* City */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                            City <span style={{ color: 'var(--color-error)' }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={addressForm.city}
                            onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                            placeholder="e.g. Jaipur"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: 'var(--radius-sm)',
                              border: addressErrors.city ? '1px solid var(--color-error)' : '1px solid var(--color-border)',
                              fontSize: '0.9rem'
                            }}
                          />
                          {addressErrors.city && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>
                              {addressErrors.city}
                            </span>
                          )}
                        </div>

                        {/* State */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                            State <span style={{ color: 'var(--color-error)' }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={addressForm.state}
                            onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                            placeholder="e.g. Rajasthan"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: 'var(--radius-sm)',
                              border: addressErrors.state ? '1px solid var(--color-error)' : '1px solid var(--color-border)',
                              fontSize: '0.9rem'
                            }}
                          />
                          {addressErrors.state && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>
                              {addressErrors.state}
                            </span>
                          )}
                        </div>

                        {/* PIN Code */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                            PIN Code <span style={{ color: 'var(--color-error)' }}>*</span>
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            value={addressForm.pincode}
                            onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value.replace(/\D/g, '') })}
                            placeholder="6-digit PIN"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: 'var(--radius-sm)',
                              border: addressErrors.pincode ? '1px solid var(--color-error)' : '1px solid var(--color-border)',
                              fontSize: '0.9rem'
                            }}
                          />
                          {addressErrors.pincode && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '4px', display: 'block' }}>
                              {addressErrors.pincode}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Address Type */}
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
                          Address Type
                        </label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          {['Home', 'Office', 'Other'].map((type) => (
                            <label
                              key={type}
                              style={{
                                padding: '8px 16px',
                                borderRadius: 'var(--radius-full)',
                                border: addressForm.address_type === type ? '2px solid var(--color-primary-terracotta)' : '1px solid var(--color-border)',
                                backgroundColor: addressForm.address_type === type ? 'var(--color-soft-beige)' : 'var(--color-white)',
                                color: 'var(--color-text-primary)',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <input
                                type="radio"
                                name="address_type"
                                value={type}
                                checked={addressForm.address_type === type}
                                onChange={(e) => setAddressForm({ ...addressForm, address_type: e.target.value })}
                                style={{ display: 'none' }}
                              />
                              {addressForm.address_type === type && <Check size={14} color="var(--color-primary-terracotta)" />}
                              <span>{type}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Default Address Checkbox */}
                      <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input
                            type="checkbox"
                            checked={addressForm.is_default || addresses.length === 0}
                            disabled={addresses.length === 0}
                            onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                            style={{ accentColor: 'var(--color-primary-terracotta)', width: '16px', height: '16px' }}
                          />
                          <span>Make this my default delivery address</span>
                        </label>
                      </div>

                      {/* Form Actions */}
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <Button 
                          type="submit" 
                          variant="primary" 
                          loading={savingAddress}
                        >
                          Save Address
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleCancelAddressForm}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Navigation footer for step 1 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                    <Button variant="ghost" onClick={() => navigate('/cart')}>
                      ← Return to Cart
                    </Button>
                    <Button 
                      variant="primary" 
                      onClick={() => setStep(2)}
                      disabled={!selectedAddressId && addresses.length === 0}
                    >
                      Continue to Payment →
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==========================================================
            STEP 2: Payment Mode & Order Review
            ========================================================== */}
        {step === 2 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '32px',
            maxWidth: '1000px',
            margin: '0 auto'
          }}>
            {/* Left: Payment Method Selection */}
            <div style={{
              backgroundColor: 'var(--color-white)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              padding: '32px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', marginBottom: '24px', color: 'var(--color-text-primary)' }}>
                Select Payment Mode
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                {/* Cash on Delivery */}
                <label style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: paymentMethod === 'cod' ? '2px solid var(--color-primary-terracotta)' : '1px solid var(--color-border)',
                  backgroundColor: paymentMethod === 'cod' ? 'var(--color-warm-cream)' : 'var(--color-white)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    style={{ accentColor: 'var(--color-primary-terracotta)', width: '18px', height: '18px' }}
                  />
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-soft-beige)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Truck size={20} color="var(--color-primary-terracotta)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Cash on Delivery (COD)</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      Pay with cash or UPI directly upon physical delivery at your doorstep
                    </div>
                  </div>
                </label>

                {/* Online Payment */}
                <label style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: paymentMethod === 'online' ? '2px solid var(--color-primary-terracotta)' : '1px solid var(--color-border)',
                  backgroundColor: paymentMethod === 'online' ? 'var(--color-warm-cream)' : 'var(--color-white)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="online"
                    checked={paymentMethod === 'online'}
                    onChange={() => setPaymentMethod('online')}
                    style={{ accentColor: 'var(--color-primary-terracotta)', width: '18px', height: '18px' }}
                  />
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-soft-beige)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <CreditCard size={20} color="var(--color-primary-terracotta)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>Online Payment (UPI, Cards, Netbanking)</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      Secure 256-bit encrypted checkout via payment gateway
                    </div>
                  </div>
                </label>
              </div>

              {/* Delivery Address Snapshot Preview */}
              {selectedAddressId && addresses.some(a => a.id === selectedAddressId) && (
                <div style={{
                  padding: '16px',
                  backgroundColor: 'var(--color-warm-cream)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  marginBottom: '28px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary-terracotta)', letterSpacing: '0.5px' }}>
                      Delivering to:
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary-terracotta)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Change
                    </button>
                  </div>
                  {(() => {
                    const sel = addresses.find(a => a.id === selectedAddressId);
                    return (
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                          {sel.full_name || sel.name || user?.name} • {sel.mobile_number || sel.phone || user?.phone}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          {formatAddressString(sel)}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                <Button variant="ghost" onClick={() => setStep(1)}>
                  ← Edit Address
                </Button>
                <Button 
                  variant="primary" 
                  size="lg" 
                  onClick={handlePlaceOrder}
                  loading={submittingOrder}
                  disabled={submittingOrder}
                >
                  {submittingOrder ? 'Placing Order...' : 'Place Order'}
                </Button>
              </div>
            </div>

            {/* Right: Order Summary */}
            <div style={{
              backgroundColor: 'var(--color-white)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              padding: '24px',
              boxShadow: 'var(--shadow-sm)',
              height: 'fit-content'
            }}>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.25rem', marginBottom: '16px' }}>
                Order Summary ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
              </h3>

              <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {cartItems.map((item) => {
                  const p = item.product || item;
                  return (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600 }}>{item.quantity}x</span>
                        <span style={{ color: 'var(--color-text-primary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </span>
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--color-primary-terracotta)' }}>
                        ₹{(Number(p.price) * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
                  <span>Crafts Subtotal</span>
                  <span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)' }}>
                    <span>Coupon Discount</span>
                    <span>-₹{Math.round(discountAmount).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
                  <span>Packaging & Shipping</span>
                  <span>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.15rem', color: 'var(--color-primary-terracotta)', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                  <span>Total Payable</span>
                  <span>₹{Math.round(totalAmount).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================================
            STEP 3: Order Confirmation
            ========================================================== */}
        {step === 3 && confirmedOrder && (
          <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              backgroundColor: 'var(--color-white)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              padding: '48px 32px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <CheckCircle2 size={64} color="var(--color-success)" style={{ margin: '0 auto 16px' }} />
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                Order Confirmed!
              </h1>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px', fontSize: '1rem', lineHeight: 1.6 }}>
                Dhanyavaad! Your patronage directly supports Indian traditional artisans. We are hand-packing your order with care.
              </p>

              <div style={{
                backgroundColor: 'var(--color-warm-cream)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                textAlign: 'left',
                marginBottom: '32px',
                border: '1px solid var(--color-border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Order Reference:</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary-terracotta)' }}>#{confirmedOrder.id || confirmedOrder.order_id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Payment Method:</span>
                  <span style={{ fontWeight: 600 }}>{confirmedOrder.payment_method?.toUpperCase() || paymentMethod.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Total Amount:</span>
                  <span style={{ fontWeight: 700 }}>₹{Number(confirmedOrder.total_amount || totalAmount).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <Button variant="primary" onClick={() => navigate('/account/orders')}>
                  Track in My Orders
                </Button>
                <Button variant="outline" onClick={() => navigate('/products')}>
                  Continue Shopping
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
