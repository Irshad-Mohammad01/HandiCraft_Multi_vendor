import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2, RefreshCw, AlertTriangle, Shield, Store, ArrowLeft } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Wishlist() {
  const navigate = useNavigate();
  const {
    items: contextItems = [],
    wishlistItems = [],
    wishlist = [],
    removeFromWishlist,
    loading = false,
    error = null,
    retry,
    loadWishlist,
  } = useWishlist();

  const { addToCart } = useCart();
  const { isOwner, isSeller, isSubOwner, isAuthenticated } = useAuth();

  // Safely verify and extract the wishlist array
  const rawList = Array.isArray(wishlistItems) && wishlistItems.length > 0
    ? wishlistItems
    : (Array.isArray(contextItems) && contextItems.length > 0
      ? contextItems
      : (Array.isArray(wishlist) ? wishlist : []));

  const items = Array.isArray(rawList) ? rawList : [];

  // 1. Role-Based Access Notice for Owner, Admin, Seller, and Sub-Owner
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
                Customer Shopping Feature
              </h1>
              <p className="text-xs sm:text-sm text-[#6F625D] max-w-md mx-auto leading-relaxed">
                Wishlist and shopping basket collections are dedicated features for customer patrons. As a {roleTitle}, you can manage products, track orders, and view sales reports from your dashboard.
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

  // 2. Loading State
  if (loading) {
    return (
      <div style={{ backgroundColor: 'var(--color-warm-cream)', minHeight: '80vh', padding: '80px 0' }}>
        <div className="container text-center">
          <LoadingSpinner label="Retrieving your saved artisanal treasures..." size="lg" />
        </div>
      </div>
    );
  }

  // 3. Error State with Retry
  if (error) {
    return (
      <div style={{ backgroundColor: 'var(--color-warm-cream)', minHeight: '80vh', padding: '64px 0' }}>
        <div className="container max-w-md mx-auto px-4">
          <div className="bg-white rounded-3xl p-8 border border-[#E6D8CC] craft-card-shadow text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-[#B84242] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2B2523]">
              Unable to Load Wishlist
            </h2>
            <p className="text-xs sm:text-sm text-[#6F625D] leading-relaxed">
              {error}
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (typeof retry === 'function') retry();
                  else if (typeof loadWishlist === 'function') loadWishlist();
                }}
                className="inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
              <Link
                to="/products"
                className="inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] text-[#2B2523] hover:bg-[#F4E8DC] text-xs font-semibold transition-all cursor-pointer"
              >
                <span>Continue Shopping</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Empty Wishlist State
  if (items.length === 0) {
    return (
      <div style={{ backgroundColor: 'var(--color-warm-cream)', minHeight: '80vh', padding: '64px 0' }}>
        <div className="container">
          <EmptyState
            icon={Heart}
            title="Your Wishlist is Empty"
            message="You haven't saved any handcrafted treasures yet. Discover authentic crafts by Indian artisans and save your favorites here."
            actionLabel="Discover Handicrafts"
            onAction={() => navigate('/products')}
          />
        </div>
      </div>
    );
  }

  // Handle move to cart
  const handleMoveToCart = async (product) => {
    if (!product) return;
    try {
      await addToCart(product, 1);
      if (typeof removeFromWishlist === 'function') {
        await removeFromWishlist(product.id || product.product_id);
      }
    } catch (err) {
      console.error('Failed to move product to cart:', err);
    }
  };

  // 5. Normal Populated Wishlist View
  return (
    <div style={{ backgroundColor: 'var(--color-warm-cream)', minHeight: '100vh' }}>
      <div className="craft-container py-8 sm:py-12 safe-bottom-padding">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2B2523] mb-1">
          Saved Handicrafts
        </h1>
        <p className="text-xs sm:text-sm text-[#6F625D] mb-6 sm:mb-8">
          {items.length} {items.length === 1 ? 'craft' : 'crafts'} preserved in your collection
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-6">
          {items.map((product) => {
            if (!product) return null;
            const pId = String(product.id || product.product_id || product._id || '');
            const image = product.image_url || product.image || '/placeholder.png';
            const price = Number(product.price || 0);
            const inStock = product.stock === undefined || Number(product.stock) > 0;

            return (
              <div
                key={pId || Math.random()}
                className="bg-white rounded-2xl border border-[#E6D8CC] overflow-hidden flex flex-col shadow-xs transition-all duration-200"
              >
                {/* Image */}
                <div className="relative aspect-square w-full bg-[#FAF7F2] p-2.5 sm:p-4 flex items-center justify-center overflow-hidden border-b border-[#F0E6DC]/70">
                  <Link to={`/products/${pId}`} className="w-full h-full flex items-center justify-center">
                    <img
                      src={image}
                      alt={product.name || 'Handcrafted item'}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof removeFromWishlist === 'function') {
                        removeFromWishlist(pId);
                      }
                    }}
                    className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 shadow-xs flex items-center justify-center text-[#B84242] hover:bg-white cursor-pointer"
                    title="Remove from saved crafts"
                    aria-label="Remove from saved crafts"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-2.5 sm:p-4 flex flex-col flex-1">
                  <Link
                    to={`/products/${pId}`}
                    className="font-serif text-xs sm:text-base font-semibold text-[#2B2523] hover:text-[#A63D40] transition-colors line-clamp-1 mb-1 block"
                  >
                    {product.name || 'Handcrafted Artisan Item'}
                  </Link>

                  {(product.artisan_name || product.created_by) && (
                    <div className="text-[10px] sm:text-xs text-[#6F625D] truncate mb-2">
                      By {product.artisan_name || product.created_by}
                    </div>
                  )}

                  <div className="mt-auto pt-2 sm:pt-3 border-t border-[#F0E6DC] flex items-center justify-between gap-1 mb-2.5 sm:mb-3">
                    <span className="font-serif text-xs sm:text-base font-bold text-[#A63D40]">
                      ₹{price.toLocaleString('en-IN')}
                    </span>
                    <span className={`text-[10px] sm:text-xs font-medium ${inStock ? 'text-emerald-700' : 'text-[#B84242]'}`}>
                      {inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    icon={ShoppingBag}
                    fullWidth
                    disabled={!inStock}
                    onClick={() => handleMoveToCart(product)}
                  >
                    Move to Cart
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
