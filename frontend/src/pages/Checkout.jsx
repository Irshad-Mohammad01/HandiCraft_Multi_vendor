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
    <div 
      className="safe-bottom-padding"
      style={{ 
        backgroundColor: 'var(--color-warm-cream)', 
        minHeight: '100vh', 
        paddingTop: '20px', 
        paddingBottom: '96px', 
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}
    >
      <div 
        style={{ 
          maxWidth: '1080px', 
          margin: '0 auto', 
          paddingLeft: '12px', 
          paddingRight: '12px',
          width: '100%',
          boxSizing: 'border-box',
          minWidth: 0
        }}
      >
        
        {/* Step Indicator - Desktop (sm and above >= 640px) */}
        <div 
          className="hidden sm:flex items-center justify-center gap-3 md:gap-4 mb-7 md:mb-9"
          style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}
        >
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
            <span className="text-sm md:text-base">Delivery Address</span>
          </div>

          <div style={{ width: '36px', height: '2px', backgroundColor: step >= 2 ? 'var(--color-primary-terracotta)' : 'var(--color-border)' }} />

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
            <span className="text-sm md:text-base">Payment & Review</span>
          </div>

          <div style={{ width: '36px', height: '2px', backgroundColor: step === 3 ? 'var(--color-primary-terracotta)' : 'var(--color-border)' }} />

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
            <span className="text-sm md:text-base">Confirmation</span>
          </div>
        </div>

        {/* Step Indicator - Responsive 3-Column Mobile Stepper (< 640px) */}
        <div className="sm:hidden w-full mb-6 box-border">
          <div className="grid grid-cols-3 relative w-full items-start">
            {/* Connector Line 1 to 2 */}
            <div 
              className="absolute top-3.5 left-[16.66%] right-[50%] h-[2px] z-0 -translate-y-1/2"
              style={{ backgroundColor: step >= 2 ? 'var(--color-primary-terracotta)' : 'var(--color-border)' }}
            />
            {/* Connector Line 2 to 3 */}
            <div 
              className="absolute top-3.5 left-[50%] right-[16.66%] h-[2px] z-0 -translate-y-1/2"
              style={{ backgroundColor: step === 3 ? 'var(--color-primary-terracotta)' : 'var(--color-border)' }}
            />

            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center text-center px-1">
              <span 
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 transition-colors"
                style={{
                  backgroundColor: step >= 1 ? 'var(--color-primary-terracotta)' : 'var(--color-border)',
                  color: 'var(--color-white)',
                  boxShadow: step === 1 ? '0 0 0 3px rgba(166, 61, 64, 0.15)' : 'none'
                }}
              >
                {step > 1 ? <Check size={14} className="stroke-[3]" /> : '1'}
              </span>
              <span 
                className="text-[11px] leading-tight font-semibold"
                style={{ color: step >= 1 ? 'var(--color-primary-terracotta)' : 'var(--color-text-secondary)' }}
              >
                Delivery<br />Address
              </span>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center text-center px-1">
              <span 
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 transition-colors"
                style={{
                  backgroundColor: step >= 2 ? 'var(--color-primary-terracotta)' : 'var(--color-border)',
                  color: 'var(--color-white)',
                  boxShadow: step === 2 ? '0 0 0 3px rgba(166, 61, 64, 0.15)' : 'none'
                }}
              >
                {step > 2 ? <Check size={14} className="stroke-[3]" /> : '2'}
              </span>
              <span 
                className="text-[11px] leading-tight font-semibold"
                style={{ color: step >= 2 ? 'var(--color-primary-terracotta)' : 'var(--color-text-secondary)' }}
              >
                Payment<br />&amp; Review
              </span>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center text-center px-1">
              <span 
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 transition-colors"
                style={{
                  backgroundColor: step === 3 ? 'var(--color-primary-terracotta)' : 'var(--color-border)',
                  color: 'var(--color-white)',
                  boxShadow: step === 3 ? '0 0 0 3px rgba(166, 61, 64, 0.15)' : 'none'
                }}
              >
                3
              </span>
              <span 
                className="text-[11px] leading-tight font-semibold"
                style={{ color: step === 3 ? 'var(--color-primary-terracotta)' : 'var(--color-text-secondary)' }}
              >
                Order<br />Confirmation
              </span>
            </div>
          </div>
        </div>

        {/* Global Notifications */}
        {orderError && (
          <div 
            className="w-full max-w-[800px] mx-auto mb-5 p-3.5 sm:p-4 rounded-xl border border-[#B84242] bg-[#FFEBEE] text-[#B84242] flex items-start gap-2.5 text-xs sm:text-sm box-border"
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span className="min-w-0 flex-1 break-words">{orderError}</span>
          </div>
        )}

        {addressSuccessMsg && (
          <div 
            className="w-full max-w-[800px] mx-auto mb-5 p-3 sm:p-3.5 rounded-xl border border-[#3F7D5A] bg-[#E8F5E9] text-[#3F7D5A] flex items-center gap-2.5 text-xs sm:text-sm box-border"
          >
            <CheckCircle2 size={18} className="shrink-0" />
            <span className="min-w-0 flex-1 break-words">{addressSuccessMsg}</span>
          </div>
        )}

        {/* ==========================================================
            STEP 1: Delivery Address Management
            ========================================================== */}
        {step === 1 && (
          <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', minWidth: 0 }}>
            <div 
              className="bg-white rounded-2xl border border-[#E6D8CC] p-3.5 sm:p-6 md:p-8 shadow-xs w-full box-border min-w-0"
            >
              {/* Header with Heading & Add New Address Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
                <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#2B2523] m-0">
                  Delivery Address
                </h2>
                {addresses.length > 0 && !showAddressForm && (
                  <Button 
                    variant="outline" 
                    icon={Plus} 
                    size="sm"
                    onClick={handleOpenAddForm}
                    className="self-start sm:self-auto shrink-0 text-xs sm:text-sm px-3 py-1.5"
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
                <div className="w-full min-w-0">
                  {/* Empty state: customer has no addresses */}
                  {addresses.length === 0 && !showAddressForm && (
                    <div className="text-center p-6 sm:p-10 bg-[#FFF9F3] rounded-xl border border-dashed border-[#E6D8CC] mb-6">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#F4E8DC] flex items-center justify-center mx-auto mb-3.5">
                        <MapPin size={24} color="var(--color-primary-terracotta)" />
                      </div>
                      <h4 className="m-0 mb-1.5 text-[#2B2523] text-base sm:text-lg font-bold">
                        No delivery address found
                      </h4>
                      <p className="m-0 mb-4 text-[#6F625D] text-xs sm:text-sm max-w-sm mx-auto">
                        No delivery address found. Please add your delivery address to continue.
                      </p>
                      <Button 
                        variant="primary" 
                        icon={Plus} 
                        onClick={handleOpenAddForm}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        Add New Delivery Address
                      </Button>
                    </div>
                  )}

                  {/* Saved Addresses List */}
                  {addresses.length > 0 && !showAddressForm && (
                    <div className="flex flex-col gap-3.5 sm:gap-4 mb-6">
                      {addresses.map((addr) => {
                        const isSelected = selectedAddressId === addr.id;
                        const addressText = formatAddressString(addr);

                        return (
                          <div
                            key={addr.id}
                            onClick={() => setSelectedAddressId(addr.id)}
                            className={`p-3.5 sm:p-5 rounded-xl border transition-all cursor-pointer relative box-border w-full min-w-0 ${
                              isSelected
                                ? 'border-[#A63D40] bg-[#FFF9F3] ring-1 ring-[#A63D40]/30 shadow-xs'
                                : 'border-[#E6D8CC] bg-white hover:border-[#C69A5B]/60'
                            }`}
                            style={{ boxSizing: 'border-box', width: '100%', maxWidth: '100%', minWidth: 0 }}
                          >
                            {/* Address Card Top Row: Radio + Name on left, Actions on right */}
                            <div 
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                gap: '8px',
                                marginBottom: '6px'
                              }}
                            >
                              {/* Customer Information */}
                              <div 
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '10px',
                                  minWidth: 0,
                                  flex: 1
                                }}
                              >
                                <input
                                  type="radio"
                                  name="selectedAddress"
                                  checked={isSelected}
                                  onChange={() => setSelectedAddressId(addr.id)}
                                  aria-label={`Select address for ${addr.full_name || addr.name || 'Customer'}`}
                                  style={{
                                    accentColor: 'var(--color-primary-terracotta)',
                                    width: '18px',
                                    height: '18px',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    marginTop: '2px'
                                  }}
                                />
                                <span 
                                  className="font-bold text-sm sm:text-base text-[#2B2523] break-words"
                                  style={{ minWidth: 0, wordBreak: 'break-word', lineHeight: 1.4 }}
                                >
                                  {addr.full_name || addr.name || user?.name || 'Customer'}
                                </span>
                              </div>

                              {/* Dedicated Action Area: Edit and Delete */}
                              <div 
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  flexShrink: 0
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenEditForm(addr, e)}
                                  className="p-1.5 sm:p-2 text-[#6F625D] hover:text-[#A63D40] hover:bg-[#F4E8DC] rounded-md transition-colors cursor-pointer"
                                  title="Edit address"
                                  aria-label="Edit address"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteAddress(addr.id, e)}
                                  className="p-1.5 sm:p-2 text-[#B84242] hover:text-[#8F3034] hover:bg-[#FFEBEE] rounded-md transition-colors cursor-pointer"
                                  title="Delete address"
                                  aria-label="Delete address"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>

                            {/* Details indented under radio button */}
                            <div style={{ marginLeft: '28px', minWidth: 0 }}>
                              {/* HOME / Default Badges & Set as Default Button */}
                              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                <span 
                                  style={{
                                    fontSize: '0.7rem',
                                    backgroundColor: 'var(--color-soft-beige)',
                                    padding: '2px 8px',
                                    borderRadius: 'var(--radius-full)',
                                    color: 'var(--color-text-primary)',
                                    textTransform: 'uppercase',
                                    fontWeight: 700,
                                    letterSpacing: '0.5px'
                                  }}
                                >
                                  {addr.address_type || 'Home'}
                                </span>
                                {addr.is_default ? (
                                  <span 
                                    style={{
                                      fontSize: '0.7rem',
                                      backgroundColor: '#E8F5E9',
                                      padding: '2px 8px',
                                      borderRadius: 'var(--radius-full)',
                                      color: 'var(--color-success)',
                                      fontWeight: 700
                                    }}
                                  >
                                    Default
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => handleSetDefaultAddress(addr.id, e)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--color-primary-terracotta)',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      padding: '2px 4px',
                                      textDecoration: 'underline'
                                    }}
                                  >
                                    Set as Default
                                  </button>
                                )}
                              </div>

                              {/* Address Text */}
                              <p 
                                style={{
                                  margin: '0 0 8px 0',
                                  fontSize: '0.85rem',
                                  color: 'var(--color-text-primary)',
                                  lineHeight: 1.5,
                                  wordBreak: 'break-word'
                                }}
                              >
                                {addressText}
                              </p>

                              {/* Mobile Number */}
                              <div style={{ fontSize: '0.825rem', color: 'var(--color-text-secondary)', wordBreak: 'break-all' }}>
                                Mobile: <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{addr.mobile_number || addr.phone || user?.phone || 'Not provided'}</span>
                              </div>
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
                      className="bg-[#FFF9F3] p-3.5 sm:p-6 rounded-xl border border-[#E6D8CC] mb-6 w-full box-border min-w-0"
                    >
                      <h4 className="m-0 mb-4 sm:mb-5 text-[#2B2523] font-serif text-lg sm:text-xl font-bold">
                        {editingAddressId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
                      </h4>

                      {addressErrors.submit && (
                        <div className="mb-4 p-2.5 sm:p-3 bg-[#FFEBEE] border border-[#B84242] rounded-lg text-[#B84242] text-xs sm:text-sm break-words">
                          {addressErrors.submit}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3.5 sm:mb-4">
                        {/* Full Name */}
                        <div className="min-w-0">
                          <label className="block text-xs sm:text-sm font-semibold mb-1 text-[#2B2523]">
                            Full Name <span className="text-[#B84242]">*</span>
                          </label>
                          <input
                            type="text"
                            value={addressForm.full_name}
                            onChange={(e) => setAddressForm({ ...addressForm, full_name: e.target.value })}
                            placeholder="Enter full name"
                            className={`w-full min-w-0 px-3 py-2 sm:py-2.5 rounded-lg border text-xs sm:text-sm bg-white box-border focus:outline-none focus:ring-1 focus:ring-[#A63D40] ${
                              addressErrors.full_name ? 'border-[#B84242]' : 'border-[#E6D8CC]'
                            }`}
                          />
                          {addressErrors.full_name && (
                            <span className="text-[11px] text-[#B84242] mt-1 block">
                              {addressErrors.full_name}
                            </span>
                          )}
                        </div>

                        {/* Mobile Number */}
                        <div className="min-w-0">
                          <label className="block text-xs sm:text-sm font-semibold mb-1 text-[#2B2523]">
                            Mobile Number <span className="text-[#B84242]">*</span>
                          </label>
                          <input
                            type="tel"
                            maxLength={10}
                            value={addressForm.mobile_number}
                            onChange={(e) => setAddressForm({ ...addressForm, mobile_number: e.target.value.replace(/\D/g, '') })}
                            placeholder="10-digit mobile number"
                            className={`w-full min-w-0 px-3 py-2 sm:py-2.5 rounded-lg border text-xs sm:text-sm bg-white box-border focus:outline-none focus:ring-1 focus:ring-[#A63D40] ${
                              addressErrors.mobile_number ? 'border-[#B84242]' : 'border-[#E6D8CC]'
                            }`}
                          />
                          {addressErrors.mobile_number && (
                            <span className="text-[11px] text-[#B84242] mt-1 block">
                              {addressErrors.mobile_number}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3.5 sm:mb-4">
                        {/* House / Flat / Building Number */}
                        <div className="min-w-0">
                          <label className="block text-xs sm:text-sm font-semibold mb-1 text-[#2B2523]">
                            House / Flat / Building Number <span className="text-[#B84242]">*</span>
                          </label>
                          <input
                            type="text"
                            value={addressForm.house_number}
                            onChange={(e) => setAddressForm({ ...addressForm, house_number: e.target.value })}
                            placeholder="e.g. Flat 302, Green Heights"
                            className={`w-full min-w-0 px-3 py-2 sm:py-2.5 rounded-lg border text-xs sm:text-sm bg-white box-border focus:outline-none focus:ring-1 focus:ring-[#A63D40] ${
                              addressErrors.house_number ? 'border-[#B84242]' : 'border-[#E6D8CC]'
                            }`}
                          />
                          {addressErrors.house_number && (
                            <span className="text-[11px] text-[#B84242] mt-1 block">
                              {addressErrors.house_number}
                            </span>
                          )}
                        </div>

                        {/* Street / Area / Locality */}
                        <div className="min-w-0">
                          <label className="block text-xs sm:text-sm font-semibold mb-1 text-[#2B2523]">
                            Street / Area / Locality <span className="text-[#B84242]">*</span>
                          </label>
                          <input
                            type="text"
                            value={addressForm.street}
                            onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                            placeholder="e.g. MG Road, Civil Lines"
                            className={`w-full min-w-0 px-3 py-2 sm:py-2.5 rounded-lg border text-xs sm:text-sm bg-white box-border focus:outline-none focus:ring-1 focus:ring-[#A63D40] ${
                              addressErrors.street ? 'border-[#B84242]' : 'border-[#E6D8CC]'
                            }`}
                          />
                          {addressErrors.street && (
                            <span className="text-[11px] text-[#B84242] mt-1 block">
                              {addressErrors.street}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
                        {/* Landmark (Optional) */}
                        <div className="min-w-0">
                          <label className="block text-xs sm:text-sm font-semibold mb-1 text-[#2B2523]">
                            Landmark <span className="text-[11px] text-[#6F625D] font-normal">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={addressForm.landmark}
                            onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                            placeholder="e.g. Near Post Office"
                            className="w-full min-w-0 px-3 py-2 sm:py-2.5 rounded-lg border border-[#E6D8CC] text-xs sm:text-sm bg-white box-border focus:outline-none focus:ring-1 focus:ring-[#A63D40]"
                          />
                        </div>

                        {/* City */}
                        <div className="min-w-0">
                          <label className="block text-xs sm:text-sm font-semibold mb-1 text-[#2B2523]">
                            City <span className="text-[#B84242]">*</span>
                          </label>
                          <input
                            type="text"
                            value={addressForm.city}
                            onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                            placeholder="e.g. Jaipur"
                            className={`w-full min-w-0 px-3 py-2 sm:py-2.5 rounded-lg border text-xs sm:text-sm bg-white box-border focus:outline-none focus:ring-1 focus:ring-[#A63D40] ${
                              addressErrors.city ? 'border-[#B84242]' : 'border-[#E6D8CC]'
                            }`}
                          />
                          {addressErrors.city && (
                            <span className="text-[11px] text-[#B84242] mt-1 block">
                              {addressErrors.city}
                            </span>
                          )}
                        </div>

                        {/* State */}
                        <div className="min-w-0">
                          <label className="block text-xs sm:text-sm font-semibold mb-1 text-[#2B2523]">
                            State <span className="text-[#B84242]">*</span>
                          </label>
                          <input
                            type="text"
                            value={addressForm.state}
                            onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                            placeholder="e.g. Rajasthan"
                            className={`w-full min-w-0 px-3 py-2 sm:py-2.5 rounded-lg border text-xs sm:text-sm bg-white box-border focus:outline-none focus:ring-1 focus:ring-[#A63D40] ${
                              addressErrors.state ? 'border-[#B84242]' : 'border-[#E6D8CC]'
                            }`}
                          />
                          {addressErrors.state && (
                            <span className="text-[11px] text-[#B84242] mt-1 block">
                              {addressErrors.state}
                            </span>
                          )}
                        </div>

                        {/* PIN Code */}
                        <div className="min-w-0">
                          <label className="block text-xs sm:text-sm font-semibold mb-1 text-[#2B2523]">
                            PIN Code <span className="text-[#B84242]">*</span>
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            value={addressForm.pincode}
                            onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value.replace(/\D/g, '') })}
                            placeholder="6-digit PIN"
                            className={`w-full min-w-0 px-3 py-2 sm:py-2.5 rounded-lg border text-xs sm:text-sm bg-white box-border focus:outline-none focus:ring-1 focus:ring-[#A63D40] ${
                              addressErrors.pincode ? 'border-[#B84242]' : 'border-[#E6D8CC]'
                            }`}
                          />
                          {addressErrors.pincode && (
                            <span className="text-[11px] text-[#B84242] mt-1 block">
                              {addressErrors.pincode}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Address Type */}
                      <div className="mb-4">
                        <label className="block text-xs sm:text-sm font-semibold mb-1.5 text-[#2B2523]">
                          Address Type
                        </label>
                        <div className="flex flex-wrap gap-2 sm:gap-2.5">
                          {['Home', 'Office', 'Other'].map((type) => (
                            <label
                              key={type}
                              className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all ${
                                addressForm.address_type === type
                                  ? 'border-[#A63D40] bg-[#F4E8DC] text-[#2B2523]'
                                  : 'border-[#E6D8CC] bg-white text-[#6F625D]'
                              }`}
                            >
                              <input
                                type="radio"
                                name="address_type"
                                value={type}
                                checked={addressForm.address_type === type}
                                onChange={(e) => setAddressForm({ ...addressForm, address_type: e.target.value })}
                                className="hidden"
                              />
                              {addressForm.address_type === type && <Check size={14} color="var(--color-primary-terracotta)" />}
                              <span>{type}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Default Address Checkbox */}
                      <div className="mb-5">
                        <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm text-[#2B2523]">
                          <input
                            type="checkbox"
                            checked={addressForm.is_default || addresses.length === 0}
                            disabled={addresses.length === 0}
                            onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                            className="accent-[#A63D40] w-4 h-4"
                          />
                          <span>Make this my default delivery address</span>
                        </label>
                      </div>

                      {/* Form Actions */}
                      <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleCancelAddressForm}
                          className="w-full sm:w-auto text-xs sm:text-sm py-2"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          variant="primary" 
                          loading={savingAddress}
                          className="w-full sm:w-auto text-xs sm:text-sm py-2"
                        >
                          Save Address
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Navigation footer for step 1 */}
                  <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-5 border-t border-[#E6D8CC] mt-6">
                    <Button 
                      variant="ghost" 
                      onClick={() => navigate('/cart')}
                      className="w-full sm:w-auto justify-center text-xs sm:text-sm py-2.5"
                    >
                      ← Return to Cart
                    </Button>
                    <Button 
                      variant="primary" 
                      onClick={() => setStep(2)}
                      disabled={!selectedAddressId && addresses.length === 0}
                      className="w-full sm:w-auto justify-center text-xs sm:text-sm py-2.5"
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8 max-w-[1040px] mx-auto w-full min-w-0">
            {/* Left Column: Payment Mode Selection & Delivery Address Preview */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E6D8CC] p-3.5 sm:p-6 md:p-8 shadow-xs w-full min-w-0 box-border">
              <h2 className="font-serif text-xl sm:text-2xl font-bold mb-5 sm:mb-6 text-[#2B2523] m-0">
                Select Payment Mode
              </h2>

              <div className="flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8">
                {/* Cash on Delivery */}
                <label 
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3 sm:gap-4 box-border ${
                    paymentMethod === 'cod'
                      ? 'border-[#A63D40] bg-[#FFF9F3] ring-1 ring-[#A63D40]/30'
                      : 'border-[#E6D8CC] bg-white hover:border-[#C69A5B]/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                    className="accent-[#A63D40] w-4.5 h-4.5 shrink-0 cursor-pointer"
                  />
                  <div className="w-10 h-10 rounded-full bg-[#F4E8DC] flex items-center justify-center shrink-0">
                    <Truck size={20} color="var(--color-primary-terracotta)" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm sm:text-base text-[#2B2523] leading-snug">
                      Cash on Delivery (COD)
                    </div>
                    <div className="text-xs text-[#6F625D] mt-0.5 leading-relaxed">
                      Pay with cash or UPI directly upon physical delivery at your doorstep
                    </div>
                  </div>
                </label>

                {/* Online Payment */}
                <label 
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3 sm:gap-4 box-border ${
                    paymentMethod === 'online'
                      ? 'border-[#A63D40] bg-[#FFF9F3] ring-1 ring-[#A63D40]/30'
                      : 'border-[#E6D8CC] bg-white hover:border-[#C69A5B]/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="online"
                    checked={paymentMethod === 'online'}
                    onChange={() => setPaymentMethod('online')}
                    className="accent-[#A63D40] w-4.5 h-4.5 shrink-0 cursor-pointer"
                  />
                  <div className="w-10 h-10 rounded-full bg-[#F4E8DC] flex items-center justify-center shrink-0">
                    <CreditCard size={20} color="var(--color-primary-terracotta)" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm sm:text-base text-[#2B2523] leading-snug">
                      Online Payment (UPI, Cards, Netbanking)
                    </div>
                    <div className="text-xs text-[#6F625D] mt-0.5 leading-relaxed">
                      Secure 256-bit encrypted checkout via payment gateway
                    </div>
                  </div>
                </label>
              </div>

              {/* Delivery Address Snapshot Preview */}
              {selectedAddressId && addresses.some(a => a.id === selectedAddressId) && (
                <div className="p-3.5 sm:p-4 bg-[#FFF9F3] rounded-xl border border-[#E6D8CC] mb-6 sm:mb-8 box-border">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#A63D40]">
                      Delivering to:
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs font-semibold text-[#A63D40] hover:underline cursor-pointer bg-transparent border-0 p-1"
                    >
                      Change Address
                    </button>
                  </div>
                  {(() => {
                    const sel = addresses.find(a => a.id === selectedAddressId);
                    return (
                      <div>
                        <div className="font-semibold text-xs sm:text-sm text-[#2B2523] break-words">
                          {sel.full_name || sel.name || user?.name} • {sel.mobile_number || sel.phone || user?.phone}
                        </div>
                        <div className="text-xs text-[#6F625D] mt-1 leading-relaxed break-words">
                          {formatAddressString(sel)}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Navigation footer for step 2 */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-5 border-t border-[#E6D8CC]">
                <Button 
                  variant="ghost" 
                  onClick={() => setStep(1)}
                  className="w-full sm:w-auto justify-center text-xs sm:text-sm py-2.5"
                >
                  ← Edit Address
                </Button>
                <Button 
                  variant="primary" 
                  size="lg" 
                  onClick={handlePlaceOrder}
                  loading={submittingOrder}
                  disabled={submittingOrder}
                  className="w-full sm:w-auto justify-center text-sm sm:text-base py-3 font-semibold"
                >
                  {submittingOrder ? 'Placing Order...' : 'Place Order'}
                </Button>
              </div>
            </div>

            {/* Right Column: Order Summary */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E6D8CC] p-3.5 sm:p-6 shadow-xs h-fit w-full min-w-0 box-border">
              <h3 className="font-serif text-lg sm:text-xl font-bold mb-3.5 sm:mb-4 text-[#2B2523] m-0">
                Order Summary ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
              </h3>

              <div className="max-h-72 overflow-y-auto divide-y divide-[#E6D8CC]/50 mb-4 pr-1">
                {cartItems.map((item) => {
                  const p = item.product || item;
                  return (
                    <div key={p.id} className="py-2.5 flex items-start justify-between gap-3 text-xs sm:text-sm">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <span className="font-bold text-[#A63D40] shrink-0 mt-0.5">{item.quantity}×</span>
                        <span className="text-[#2B2523] leading-snug break-words">
                          {p.name}
                        </span>
                      </div>
                      <span className="font-bold text-[#A63D40] shrink-0 whitespace-nowrap mt-0.5">
                        ₹{(Number(p.price) * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-[#E6D8CC] pt-3.5 flex flex-col gap-2 text-xs sm:text-sm">
                <div className="flex justify-between items-center text-[#6F625D]">
                  <span>Crafts Subtotal</span>
                  <span className="font-medium text-[#2B2523]">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-[#3F7D5A]">
                    <span>Coupon Discount</span>
                    <span className="font-medium">-₹{Math.round(discountAmount).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-[#6F625D]">
                  <span>Packaging &amp; Shipping</span>
                  <span className="font-medium text-[#2B2523]">{shipping === 0 ? 'FREE' : `₹${shipping}`}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-base sm:text-lg text-[#A63D40] border-t border-[#E6D8CC] pt-3 mt-1">
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
          <div className="max-w-[640px] mx-auto text-center w-full min-w-0 box-border">
            <div className="bg-white rounded-2xl border border-[#E6D8CC] p-5 sm:p-8 md:p-12 shadow-xs box-border">
              <CheckCircle2 size={56} color="var(--color-success)" className="mx-auto mb-3.5 sm:mb-4" />
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2B2523] mb-2 m-0">
                Order Confirmed!
              </h1>
              <p className="text-[#6F625D] mb-5 sm:mb-6 text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
                Dhanyavaad! Your patronage directly supports Indian traditional artisans. We are hand-packing your order with care.
              </p>

              <div className="bg-[#FFF9F3] rounded-xl p-3.5 sm:p-5 text-left mb-6 sm:mb-8 border border-[#E6D8CC] text-xs sm:text-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[#6F625D]">Order Reference:</span>
                  <span className="font-bold text-[#A63D40]">#{confirmedOrder.id || confirmedOrder.order_id}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[#6F625D]">Payment Method:</span>
                  <span className="font-semibold text-[#2B2523]">{confirmedOrder.payment_method?.toUpperCase() || paymentMethod.toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6F625D]">Total Amount:</span>
                  <span className="font-bold text-[#2B2523]">₹{Number(confirmedOrder.total_amount || totalAmount).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Button 
                  variant="primary" 
                  onClick={() => navigate('/account/orders')}
                  className="w-full sm:w-auto text-xs sm:text-sm py-2.5"
                >
                  Track in My Orders
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/products')}
                  className="w-full sm:w-auto text-xs sm:text-sm py-2.5"
                >
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
