import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Tag,
  AlertCircle,
  Check,
  Sparkles,
  Truck,
  RotateCcw,
  Shield,
  Store,
  ArrowLeft,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { couponsApi } from '../api/coupons';
import EmptyState from '../components/common/EmptyState';

export default function Cart() {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeFromCart, getSubtotal } = useCart();
  const { isOwner, isSeller, isSubOwner, isAuthenticated } = useAuth();

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Role-based check: restrict Owner, Seller, Sub-owner from accessing customer cart in UI
  if (isAuthenticated && (isOwner || isSeller || isSubOwner)) {
    const dashboardPath = isOwner
      ? '/owner/dashboard'
      : (isSubOwner ? '/sub-owner/dashboard' : '/seller/dashboard');
    const roleTitle = isOwner
      ? 'Platform Owner'
      : (isSubOwner ? 'Operations Sub-Owner' : 'Artisan Seller');

    return (
      <div style={{ backgroundColor: 'var(--color-warm-cream)', minHeight: '80vh', padding: '64px 0' }}>
        <div className="container max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#E6D8CC] craft-card-shadow text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-[#FFF9F3] border border-[#E6D8CC] text-[#A63D40] flex items-center justify-center mx-auto">
              {isOwner ? <Shield className="w-8 h-8" /> : <Store className="w-8 h-8" />}
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FFF9F3] text-[#A63D40] border border-[#E6D8CC] mb-2">
                {roleTitle} Account
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2B2523] mb-2">
                Customer Shopping Basket
              </h1>
              <p className="text-xs sm:text-sm text-[#6F625D] max-w-md mx-auto leading-relaxed">
                Cart checkout operations are dedicated features for customer patrons. As a {roleTitle}, you can manage your catalogue, inventory, orders, and customer shipments from your dashboard.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to={dashboardPath}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs font-semibold shadow-md transition-all cursor-pointer"
              >
                <span>Go to {roleTitle} Dashboard</span>
              </Link>
              <Link
                to="/products"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] text-[#2B2523] hover:bg-[#F4E8DC] text-xs font-semibold transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Browse Storefront</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const subtotal = getSubtotal();
  const shippingThreshold = 999;
  const shipping = subtotal >= shippingThreshold || subtotal === 0 ? 0 : 99;

  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'percentage') {
      discountAmount = (subtotal * appliedCoupon.discount_value) / 100;
    } else {
      discountAmount = appliedCoupon.discount_value;
    }
  }

  const finalTotal = Math.max(0, subtotal - discountAmount + shipping);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setValidatingCoupon(true);
    setCouponError('');
    try {
      const res = await couponsApi.validate({
        code: couponCode.trim().toUpperCase(),
        cart_amount: subtotal,
      });
      if (res && res.valid) {
        setAppliedCoupon(
          res.coupon || {
            code: couponCode.trim().toUpperCase(),
            discount_type: res.discount_type || 'percentage',
            discount_value: res.discount_value || 10,
          }
        );
        setCouponError('');
      } else {
        setCouponError(res?.message || 'Invalid or expired coupon code.');
      }
    } catch (err) {
      setCouponError(
        err.response?.data?.message || 'Invalid coupon code or minimum order value not reached.'
      );
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  if (cartItems.length === 0) {
    return (
      <div className="craft-container min-h-[70vh] flex items-center justify-center py-16">
        <EmptyState
          icon={ShoppingBag}
          title="Your Craft Basket is Empty"
          message="You haven't added any authentic handcrafted creations to your basket yet. Discover our curated collections directly from master artisans across India."
          actionLabel="Explore Indian Handicrafts"
          onAction={() => navigate('/products')}
        />
      </div>
    );
  }

  return (
    <div className="craft-container py-8 sm:py-12 safe-bottom-padding">
      {/* Page Title & Item Count */}
      <div className="mb-8 border-b border-[#E6D8CC] pb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-[#A63D40] block mb-1">
          Review & Checkout
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#2B2523]">
          Your Artisanal Craft Basket
        </h1>
        <p className="text-xs sm:text-sm text-[#6F625D] mt-1">
          {cartItems.length} handcrafted {cartItems.length === 1 ? 'creation' : 'creations'} preserved for direct artisan dispatch
        </p>
      </div>

      {/* Two-Column Wide Layout (Desktop: Items Left, Summary Right; Mobile: Items First, Summary Below) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ==========================================================
            LEFT COLUMN: CART ITEMS LIST (lg:col-span-8)
            ========================================================== */}
        <div className="lg:col-span-8 space-y-4">
          {/* Free Shipping Progress Indicator */}
          <div className="p-4 bg-white rounded-2xl border border-[#E6D8CC] craft-card-shadow flex items-center gap-3">
            <Truck className="w-5 h-5 text-[#3F7D5A] shrink-0" />
            <div className="flex-1 text-xs">
              {subtotal >= shippingThreshold ? (
                <span className="font-semibold text-[#3F7D5A]">
                  Congratulations! You unlocked free Pan-India delivery on this order.
                </span>
              ) : (
                <span className="text-[#2B2523]">
                  Add <strong className="text-[#A63D40]">₹{(shippingThreshold - subtotal).toLocaleString('en-IN')}</strong> more of authentic crafts for <strong className="text-[#3F7D5A]">Free Pan-India Delivery</strong>.
                </span>
              )}
            </div>
          </div>

          {/* Cart Items Cards */}
          <div className="bg-white rounded-3xl border border-[#E6D8CC] craft-card-shadow overflow-hidden divide-y divide-[#E6D8CC]">
            {cartItems.map((item) => {
              const itemPrice = Number(item.price || 0);
              const itemDiscount = Number(item.discount || 0);
              const effectivePrice = itemDiscount > 0 ? Math.round(itemPrice * (1 - itemDiscount / 100)) : itemPrice;
              const lineTotal = effectivePrice * item.quantity;
              const imgUrl = item.image || item.image_url || (item.images && item.images[0]) || 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=400&q=80';
              const itemId = String(item.id || item._id);

              return (
                <div key={itemId} className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
                  {/* Thumbnail */}
                  <Link
                    to={`/products/${itemId}`}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-[#FFF9F3] border border-[#E6D8CC] shrink-0 p-1 group"
                  >
                    <img
                      src={imgUrl}
                      alt={item.name}
                      className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {item.category && (
                      <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#C69A5B] block">
                        {typeof item.category === 'string' ? item.category : item.category.name}
                      </span>
                    )}
                    <Link
                      to={`/products/${itemId}`}
                      className="font-serif text-sm sm:text-base font-bold text-[#2B2523] hover:text-[#A63D40] transition-colors line-clamp-1 block"
                    >
                      {item.name}
                    </Link>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm sm:text-base font-bold text-[#A63D40]">
                        ₹{effectivePrice.toLocaleString('en-IN')}
                      </span>
                      {itemDiscount > 0 && (
                        <span className="text-xs text-[#6F625D] line-through">
                          ₹{itemPrice.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity & Line Total */}
                  <div className="flex items-center justify-between w-full sm:w-auto gap-4 pt-2 sm:pt-0">
                    <div className="inline-flex items-center border border-[#E6D8CC] rounded-xl bg-[#FFF9F3] p-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(itemId, Math.max(1, item.quantity - 1))}
                        disabled={item.quantity <= 1}
                        className="p-1 rounded-lg text-[#2B2523] hover:bg-white disabled:opacity-40 cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-[#2B2523]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(itemId, item.quantity + 1)}
                        className="p-1 rounded-lg text-[#2B2523] hover:bg-white cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right sm:w-28">
                      <span className="font-serif text-sm sm:text-base font-bold text-[#2B2523] block">
                        ₹{lineTotal.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(itemId)}
                      aria-label="Remove item"
                      className="p-2 text-[#6F625D] hover:text-[#B84242] hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex items-center justify-between">
            <Link
              to="/products"
              className="text-xs font-semibold text-[#A63D40] hover:underline inline-flex items-center gap-1"
            >
              <span>← Continue Exploring Handicrafts</span>
            </Link>
          </div>
        </div>

        {/* ==========================================================
            RIGHT COLUMN: ORDER SUMMARY & CHECKOUT (lg:col-span-4)
            ========================================================== */}
        <div className="lg:col-span-4 space-y-5 sticky top-28">
          {/* Summary Box */}
          <div className="bg-white rounded-3xl border border-[#E6D8CC] p-6 craft-card-shadow space-y-5">
            <h3 className="font-serif text-lg font-bold text-[#2B2523] pb-3 border-b border-[#E6D8CC]">
              Order Summary
            </h3>

            {/* Coupon Code Input */}
            <form onSubmit={handleApplyCoupon} className="space-y-2">
              <label className="block text-xs font-semibold text-[#2B2523]">
                Artisan Promotional Coupon
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="e.g. HERITAGE10, FLAT200"
                  disabled={!!appliedCoupon}
                  className="flex-1 uppercase bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl px-3 py-2 text-xs text-[#2B2523] placeholder-[#6F625D]/60 focus:bg-white focus:border-[#A63D40]"
                />
                {appliedCoupon ? (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="px-3 py-2 rounded-xl bg-rose-50 text-[#B84242] border border-rose-200 text-xs font-semibold hover:bg-rose-100 cursor-pointer"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={validatingCoupon}
                    className="px-4 py-2 rounded-xl bg-[#C69A5B] text-white hover:bg-[#B77935] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {validatingCoupon ? 'Checking...' : 'Apply'}
                  </button>
                )}
              </div>

              {couponError && (
                <p className="text-[11px] text-[#B84242] flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{couponError}</span>
                </p>
              )}

              {appliedCoupon && (
                <p className="text-[11px] text-[#3F7D5A] flex items-center gap-1 mt-1">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Coupon {appliedCoupon.code} applied successfully!</span>
                </p>
              )}
            </form>

            {/* Price Calculations */}
            <div className="space-y-2.5 text-xs text-[#6F625D] pt-3 border-t border-[#E6D8CC]">
              <div className="flex justify-between">
                <span>Handcrafted Items Subtotal</span>
                <span className="font-semibold text-[#2B2523]">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-[#3F7D5A]">
                  <span>Artisan Discount</span>
                  <span className="font-semibold">-₹{Math.round(discountAmount).toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Pan-India Shipping</span>
                <span className="font-semibold text-[#2B2523]">
                  {shipping === 0 ? <span className="text-[#3F7D5A] font-bold">FREE</span> : `₹${shipping}`}
                </span>
              </div>

              <div className="pt-3 border-t border-[#E6D8CC] flex justify-between items-baseline text-base font-bold text-[#2B2523]">
                <span>Total Amount</span>
                <span className="font-serif text-2xl text-[#A63D40]">
                  ₹{Math.round(finalTotal).toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[10px] text-[#6F625D] text-right">
                All Indian taxes included
              </p>
            </div>

            {/* Checkout Action Button */}
            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-sm font-semibold shadow-md transition-all cursor-pointer"
            >
              <span>Proceed to Secure Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Trust Guarantees */}
          <div className="p-4 bg-[#FFF9F3] rounded-2xl border border-[#E6D8CC] text-xs space-y-2 text-[#6F625D]">
            <div className="flex items-center gap-2 text-[#2B2523] font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#A63D40]" />
              <span>Direct Artisan Assurance</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Every creation is backed by authentic GI verification, insured courier transit, and 7-day hassle-free return window.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
