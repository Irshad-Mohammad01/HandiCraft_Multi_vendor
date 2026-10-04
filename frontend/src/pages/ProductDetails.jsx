import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Heart,
  ShoppingBag,
  Zap,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  Share2,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  Plus,
  Minus,
  ImageOff,
  User,
  MapPin,
  Sparkles,
  Info,
  Calendar,
  Layers,
} from 'lucide-react';
import { productsApi } from '../api/products';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import ProductCard from '../components/common/ProductCard';
import ProductManagementDetail from '../components/product/ProductManagementDetail';

function CustomerProductDetails({ id }) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { user, isAuthenticated, isOwner, isSeller, isSubOwner } = useAuth();

  const canShop = !isOwner && !isSeller && !isSubOwner;

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [mainImgError, setMainImgError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [activeTab, setActiveTab] = useState('description');

  // Review submission state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchProductDetails() {
      if (!id) return;
      setLoading(true);
      setError(null);
      setSelectedImageIndex(0);
      setMainImgError(false);
      setQuantity(1);

      try {
        const data = await productsApi.getProductById(id);
        if (!isMounted) return;

        setProduct(data);

        // Fetch related products from backend
        const catFilter = data.category || (data.category_id ? data.category_id : null);
        if (catFilter) {
          try {
            const relRes = await productsApi.getProducts({
              category: typeof catFilter === 'string' ? catFilter : catFilter.name,
              limit: 5,
            });
            const list = Array.isArray(relRes) ? relRes : relRes?.items || [];
            const filtered = list.filter((p) => String(p.id || p._id) !== String(id));
            if (isMounted) setRelatedProducts(filtered.slice(0, 4));
          } catch (e) {
            console.error('Failed to load related products:', e);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load craft details:', err);
          setError('The handcrafted item you are looking for is currently unavailable or has been archived.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchProductDetails();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Handle gallery image URLs
  const galleryImages = useMemo(() => {
    if (!product) return [];
    let list = [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      list = product.images.map((img) => (typeof img === 'string' ? img : img.image_url)).filter(Boolean);
    } else if (product.image) {
      list = [product.image];
    } else if (product.image_url) {
      list = [product.image_url];
    }

    if (list.length === 0) {
      list = ['https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1000&q=80'];
    }
    return list;
  }, [product]);

  // Parse specifications into structured data if provided as a semi-colon list or JSON
  const parsedSpecs = useMemo(() => {
    if (!product) return [];
    const specs = [];

    // Parse features if present
    const rawFeatures = product.features || product.features_en;
    const rawSpecs = product.specifications || product.specifications_en;

    if (product.category) {
      specs.push({ label: 'Craft Discipline', value: typeof product.category === 'string' ? product.category : product.category.name });
    }

    if (rawSpecs && typeof rawSpecs === 'string') {
      const parts = rawSpecs.split(';').map((s) => s.trim()).filter(Boolean);
      parts.forEach((part) => {
        if (part.includes(':')) {
          const [key, ...vals] = part.split(':');
          specs.push({ label: key.trim(), value: vals.join(':').trim() });
        } else {
          specs.push({ label: 'Specification', value: part });
        }
      });
    }

    if (product.materials) {
      specs.push({ label: 'Materials', value: product.materials });
    }
    if (product.dimensions) {
      specs.push({ label: 'Dimensions', value: product.dimensions });
    }
    if (product.origin) {
      specs.push({ label: 'Origin / Cluster', value: product.origin });
    }

    return specs;
  }, [product]);

  const parsedFeatures = useMemo(() => {
    if (!product) return [];
    const raw = product.features || product.features_en;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      return raw.split(';').map((f) => f.trim()).filter(Boolean);
    }
    return [];
  }, [product]);

  // Reviews calculation and rating breakdown
  const reviewsList = useMemo(() => {
    return Array.isArray(product?.reviews) ? product.reviews : [];
  }, [product]);

  const ratingBreakdown = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (!reviewsList.length) return counts;
    reviewsList.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating || 5))));
      counts[star] = (counts[star] || 0) + 1;
    });
    return counts;
  }, [reviewsList]);

  if (loading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center">
        <LoadingSpinner label="Gathering craft heritage specifications..." size="lg" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="craft-container py-16 text-center">
        <EmptyState
          title="Craft Creation Unavailable"
          message={error || 'This artisan piece cannot be located.'}
          actionLabel="Explore All Handicrafts"
          onAction={() => navigate('/products')}
        />
      </div>
    );
  }

  const inWishlist = isInWishlist(String(product.id || product._id));
  const price = Number(product.price || 0);
  const discount = Number(product.discount || 0);
  const effectivePrice = discount > 0 ? Math.round(price * (1 - discount / 100)) : price;
  const originalPrice = discount > 0 ? price : (product.original_price ? Number(product.original_price) : 0);
  const inStock = product.stock === undefined || Number(product.stock) > 0;
  const stockCount = Number(product.stock || 0);
  const ratingAvg = Number(product.ratings || product.rating || 4.8).toFixed(1);
  const categoryName = typeof product.category === 'string' ? product.category : product.category?.name || 'Handicrafts';

  const handleAddToCart = async () => {
    if (!inStock || addingToCart) return;
    setAddingToCart(true);
    try {
      await addToCart(product, quantity);
    } finally {
      setTimeout(() => setAddingToCart(false), 400);
    }
  };

  const handleBuyNow = () => {
    if (!inStock) return;
    addToCart(product, quantity);
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout', { state: { from: { pathname: '/checkout' } } });
      return;
    }
    navigate('/checkout');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `Discover this authentic Indian handcrafted creation: ${product.name}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login', { state: { from: { pathname: window.location.pathname } } });
      return;
    }
    setSubmittingReview(true);
    setReviewSuccess('');
    setReviewError('');

    try {
      await productsApi.addReview(id, {
        rating: Number(reviewRating),
        comment: reviewComment.trim(),
      });
      setReviewSuccess('Your review has been preserved and shared with the artisan cooperative.');
      setReviewComment('');
      // Reload fresh product data
      const updated = await productsApi.getProductById(id);
      setProduct(updated);
    } catch (err) {
      console.error('Review submission error:', err);
      setReviewError(err.response?.data?.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="safe-bottom-padding pb-12 sm:pb-16">
      {/* 1. BREADCRUMB NAVIGATION */}
      <div className="bg-[#F4E8DC]/40 border-b border-[#E6D8CC] py-3">
        <nav aria-label="Breadcrumb" className="craft-container">
          <ol className="flex items-center gap-1.5 text-xs text-[#6F625D] flex-wrap">
            <li>
              <Link to="/" className="hover:text-[#A63D40] transition-colors">
                Home
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3.5 h-3.5 text-[#6F625D]/60" />
            </li>
            <li>
              <Link to="/products" className="hover:text-[#A63D40] transition-colors">
                All Crafts
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3.5 h-3.5 text-[#6F625D]/60" />
            </li>
            <li>
              <Link
                to={`/products?category=${encodeURIComponent(categoryName)}`}
                className="hover:text-[#A63D40] transition-colors text-[#C69A5B] font-semibold"
              >
                {categoryName}
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3.5 h-3.5 text-[#6F625D]/60" />
            </li>
            <li className="text-[#2B2523] font-medium truncate max-w-[200px] sm:max-w-xs">
              {product.name}
            </li>
          </ol>
        </nav>
      </div>

      {/* 2. MAIN PRODUCT SECTION (WIDE TWO-COLUMN DESKTOP LAYOUT) */}
      <section className="craft-container pt-6 sm:pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 bg-white rounded-3xl p-4 sm:p-8 lg:p-10 border border-[#E6D8CC] craft-card-shadow">
          
          {/* ==========================================================
              LEFT COLUMN: PRODUCT IMAGE GALLERY (5 or 6 of 12 cols)
              ========================================================== */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col space-y-4">
            {/* Main Large Image Box with Aspect Ratio Preservation */}
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center p-2 group">
              {!mainImgError ? (
                <img
                  src={galleryImages[selectedImageIndex]}
                  alt={product.name}
                  loading="eager"
                  onError={() => setMainImgError(true)}
                  className="w-full h-full object-contain object-center transition-all duration-300"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-[#6F625D] p-6 text-center">
                  <ImageOff className="w-12 h-12 text-[#A63D40]/40 mb-2" />
                  <p className="text-sm font-semibold">Artisan Handcraft Visual</p>
                  <p className="text-xs text-[#6F625D]">Image loading from regional cluster archive</p>
                </div>
              )}

              {/* Discount Tag */}
              {discount > 0 && inStock && (
                <span className="absolute top-4 left-4 bg-[#A63D40] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                  {discount}% OFF
                </span>
              )}

              {/* Wishlist Button On Image - Only for Customers */}
              {canShop && (
                <button
                  type="button"
                  onClick={() => toggleWishlist(product)}
                  aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                  className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-md shadow-md transition-all cursor-pointer ${
                    inWishlist
                      ? 'bg-white text-[#A63D40] ring-1 ring-[#A63D40]/30'
                      : 'bg-white/90 text-[#6F625D] hover:text-[#A63D40] hover:bg-white'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${inWishlist ? 'fill-[#A63D40]' : ''}`} />
                </button>
              )}

              {/* Gallery Previous / Next Controls */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)
                    }
                    aria-label="Previous Image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 text-[#2B2523] hover:bg-[#A63D40] hover:text-white shadow-md transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedImageIndex((prev) => (prev + 1) % galleryImages.length)
                    }
                    aria-label="Next Image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 text-[#2B2523] hover:bg-[#A63D40] hover:text-white shadow-md transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Selectors */}
            {galleryImages.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1.5 pt-1">
                {galleryImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedImageIndex(idx);
                      setMainImgError(false);
                    }}
                    className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all p-1 bg-[#FFF9F3] shrink-0 cursor-pointer ${
                      selectedImageIndex === idx
                        ? 'border-[#A63D40] ring-2 ring-[#A63D40]/20'
                        : 'border-[#E6D8CC] hover:border-[#C69A5B]'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=200&q=80';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Trust Badges Strip */}
            <div className="grid grid-cols-3 gap-3 p-3.5 bg-[#FFF9F3] rounded-2xl border border-[#E6D8CC] text-center mt-2">
              <div className="flex flex-col items-center">
                <ShieldCheck className="w-5 h-5 text-[#A63D40] mb-1" />
                <span className="text-[11px] font-bold text-[#2B2523]">100% Authentic</span>
                <span className="text-[10px] text-[#6F625D]">Direct from Artisans</span>
              </div>
              <div className="flex flex-col items-center border-x border-[#E6D8CC]">
                <Truck className="w-5 h-5 text-[#C69A5B] mb-1" />
                <span className="text-[11px] font-bold text-[#2B2523]">Insured Delivery</span>
                <span className="text-[10px] text-[#6F625D]">Fragile Handling</span>
              </div>
              <div className="flex flex-col items-center">
                <RotateCcw className="w-5 h-5 text-[#3F7D5A] mb-1" />
                <span className="text-[11px] font-bold text-[#2B2523]">Easy Returns</span>
                <span className="text-[10px] text-[#6F625D]">7-day Guarantee</span>
              </div>
            </div>
          </div>

          {/* ==========================================================
              RIGHT COLUMN: PRODUCT DETAILS & PURCHASE ACTIONS (6 of 12)
              ========================================================== */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-start space-y-5">
            {/* Category & Share Row */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#C69A5B]">
                {categoryName}
              </span>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6F625D] hover:text-[#A63D40] transition-colors p-1"
                aria-label="Share this craft"
              >
                <Share2 className="w-4 h-4" />
                <span>{copiedLink ? 'Copied Link!' : 'Share'}</span>
              </button>
            </div>

            {/* Product Title */}
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#2B2523] leading-tight">
              {product.name}
            </h1>

            {/* Ratings, Review Count & Stock Pill */}
            <div className="flex items-center gap-3 text-xs sm:text-sm flex-wrap pb-2 border-b border-[#E6D8CC]">
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFF9F3] border border-[#E6D8CC] font-semibold text-[#2B2523]">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{ratingAvg}</span>
              </div>

              <span className="text-[#6F625D]">
                {reviewsList.length > 0
                  ? `${reviewsList.length} verified reviews`
                  : 'Artisan Verified'}
              </span>

              <span className="text-[#E6D8CC]">|</span>

              <span
                className={`font-semibold ${
                  inStock ? 'text-[#3F7D5A]' : 'text-[#B84242]'
                }`}
              >
                {inStock
                  ? stockCount > 0
                    ? `In Stock (${stockCount} pieces available)`
                    : 'In Stock'
                  : 'Currently Out of Stock'}
              </span>
            </div>

            {/* Price Box */}
            <div className="p-4 bg-[#FFF9F3] rounded-2xl border border-[#E6D8CC] space-y-1">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="font-serif text-3xl sm:text-4xl font-bold text-[#A63D40]">
                  ₹{effectivePrice.toLocaleString('en-IN')}
                </span>
                {discount > 0 && originalPrice > 0 && (
                  <>
                    <span className="text-base text-[#6F625D] line-through">
                      ₹{originalPrice.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-bold text-[#3F7D5A] bg-[#3F7D5A]/10 px-2.5 py-0.5 rounded-full">
                      Save ₹{(originalPrice - effectivePrice).toLocaleString('en-IN')} ({discount}%)
                    </span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-[#6F625D]">
                Inclusive of all craft cess and GST. Free delivery across India on orders above ₹999.
              </p>
            </div>

            {/* Short Description */}
            {product.description && (
              <p className="text-xs sm:text-sm text-[#6F625D] leading-relaxed line-clamp-3">
                {product.description}
              </p>
            )}

            {/* Distinct Features Checkpoints if available */}
            {parsedFeatures.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-bold text-[#2B2523] uppercase tracking-wider block">
                  Artisan Highlights:
                </span>
                <ul className="space-y-1 text-xs text-[#2B2523]">
                  {parsedFeatures.slice(0, 4).map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-[#3F7D5A] shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quantity Selector - Only for Customers */}
            {canShop && inStock && (
              <div className="flex items-center gap-4 pt-2">
                <span className="text-xs font-semibold text-[#2B2523]">Quantity:</span>
                <div className="inline-flex items-center border border-[#E6D8CC] rounded-xl bg-[#FFF9F3] p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="p-1.5 rounded-lg text-[#2B2523] hover:bg-white disabled:opacity-40 cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-9 text-center text-xs font-bold text-[#2B2523]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(stockCount || 99, quantity + 1))}
                    disabled={stockCount > 0 && quantity >= stockCount}
                    className="p-1.5 rounded-lg text-[#2B2523] hover:bg-white disabled:opacity-40 cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Primary Action Buttons (Desktop and Tablet) - Only for Customers */}
            {canShop && (
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  disabled={!inStock || addingToCart}
                  onClick={handleAddToCart}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-sm font-semibold shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{addingToCart ? 'Adding to Basket...' : inStock ? 'Add to Cart' : 'Sold Out'}</span>
                </button>

                {inStock && (
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-[#C69A5B] text-white hover:bg-[#B77935] text-sm font-semibold shadow-md transition-all cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Buy Now</span>
                  </button>
                )}
              </div>
            )}

            {/* About the Artisan Snippet if created_by / artisan info exists */}
            {product.created_by && (
              <div className="p-3.5 bg-[#F4E8DC]/50 rounded-2xl border border-[#E6D8CC] flex items-center justify-between gap-3 mt-auto">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#A63D40] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                    {product.created_by.charAt(0)}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#6F625D] tracking-wider block">
                      Master Artisan / Cooperative
                    </span>
                    <h4 className="text-xs font-bold text-[#2B2523] line-clamp-1">
                      {product.created_by}
                    </h4>
                  </div>
                </div>
                <Link
                  to={`/products?search=${encodeURIComponent(product.created_by)}`}
                  className="text-xs font-semibold text-[#A63D40] hover:underline shrink-0"
                >
                  View Collection
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ==========================================================
          3. PRODUCT INFORMATION & TABS (DESCRIPTION, SPECS, REVIEWS)
          ========================================================== */}
      <section className="craft-container pt-10 sm:pt-14">
        <div className="bg-white rounded-3xl border border-[#E6D8CC] overflow-hidden craft-card-shadow">
          {/* Tab Navigation Headers */}
          <div className="flex border-b border-[#E6D8CC] bg-[#FFF9F3] overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('description')}
              className={`py-4 px-6 text-xs sm:text-sm font-semibold transition-colors shrink-0 cursor-pointer border-b-2 ${
                activeTab === 'description'
                  ? 'border-[#A63D40] text-[#A63D40] bg-white'
                  : 'border-transparent text-[#6F625D] hover:text-[#2B2523]'
              }`}
            >
              Craft Narrative & Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('specifications')}
              className={`py-4 px-6 text-xs sm:text-sm font-semibold transition-colors shrink-0 cursor-pointer border-b-2 ${
                activeTab === 'specifications'
                  ? 'border-[#A63D40] text-[#A63D40] bg-white'
                  : 'border-transparent text-[#6F625D] hover:text-[#2B2523]'
              }`}
            >
              Specifications & Materials
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`py-4 px-6 text-xs sm:text-sm font-semibold transition-colors shrink-0 cursor-pointer border-b-2 ${
                activeTab === 'reviews'
                  ? 'border-[#A63D40] text-[#A63D40] bg-white'
                  : 'border-transparent text-[#6F625D] hover:text-[#2B2523]'
              }`}
            >
              Artisan Reviews ({reviewsList.length})
            </button>
          </div>

          {/* Tab 1: Detailed Narrative */}
          {activeTab === 'description' && (
            <div className="p-6 sm:p-10 space-y-6">
              <div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#2B2523] mb-3">
                  The Handcrafted Story
                </h3>
                <p className="text-sm text-[#2B2523] leading-relaxed whitespace-pre-line">
                  {product.description ||
                    'Each piece is meticulously crafted using ancestral Indian handcraft traditions. Natural variations in pigment, glaze, woodgrain, and weave tension reflect individual artisanal touch and geographical origin.'}
                </p>
              </div>

              {/* Care Instructions & Shipping Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#E6D8CC]">
                <div className="p-4 bg-[#FFF9F3] rounded-2xl border border-[#E6D8CC]">
                  <h4 className="text-xs font-bold text-[#A63D40] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#C69A5B]" />
                    <span>Care Instructions</span>
                  </h4>
                  <p className="text-xs text-[#6F625D] leading-relaxed">
                    {product.care_instructions ||
                      'Wipe gently with a soft dry cotton cloth. Keep away from harsh abrasive detergents and avoid prolonged direct moisture soaking to preserve organic glazes and natural fibers.'}
                  </p>
                </div>

                <div className="p-4 bg-[#FFF9F3] rounded-2xl border border-[#E6D8CC]">
                  <h4 className="text-xs font-bold text-[#3F7D5A] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#3F7D5A]" />
                    <span>Shipping & Return Policy</span>
                  </h4>
                  <p className="text-xs text-[#6F625D] leading-relaxed">
                    Dispatched within 24–48 hours via insured fragile courier. Free delivery on orders over ₹999. Easy 7-day hassle-free returns on any damaged transit items.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Specifications & Attributes Table */}
          {activeTab === 'specifications' && (
            <div className="p-6 sm:p-10">
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#2B2523] mb-6">
                Technical Specifications & Provenance
              </h3>

              {parsedSpecs.length > 0 ? (
                <div className="divide-y divide-[#E6D8CC] border border-[#E6D8CC] rounded-2xl overflow-hidden">
                  {parsedSpecs.map((spec, i) => (
                    <div
                      key={i}
                      className={`grid grid-cols-1 sm:grid-cols-3 p-3.5 text-xs ${
                        i % 2 === 0 ? 'bg-white' : 'bg-[#FFF9F3]'
                      }`}
                    >
                      <span className="font-semibold text-[#2B2523]">{spec.label}</span>
                      <span className="sm:col-span-2 text-[#6F625D] mt-0.5 sm:mt-0">
                        {spec.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#6F625D]">
                  Standard traditional artisanal specifications apply. Handcrafted with authentic heritage materials.
                </p>
              )}
            </div>
          )}

          {/* Tab 3: Customer Reviews */}
          {activeTab === 'reviews' && (
            <div className="p-6 sm:p-10 space-y-8">
              {/* Rating Summary Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-[#FFF9F3] rounded-2xl border border-[#E6D8CC] items-center">
                <div className="text-center md:text-left">
                  <span className="font-serif text-5xl font-bold text-[#2B2523]">{ratingAvg}</span>
                  <div className="flex items-center justify-center md:justify-start gap-1 text-amber-500 my-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.round(Number(ratingAvg))
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-[#E6D8CC]'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[#6F625D]">
                    Based on {reviewsList.length} patron reviews
                  </p>
                </div>

                {/* Rating Distribution Bars */}
                <div className="md:col-span-2 space-y-1.5 text-xs">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = ratingBreakdown[stars] || 0;
                    const pct = reviewsList.length ? Math.round((count / reviewsList.length) * 100) : 0;
                    return (
                      <div key={stars} className="flex items-center gap-2">
                        <span className="w-12 text-[#6F625D] shrink-0 font-medium">
                          {stars} Stars
                        </span>
                        <div className="flex-1 h-2 bg-[#E6D8CC] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#A63D40] rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-[#6F625D] shrink-0">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Review Form */}
              <div className="p-6 bg-white rounded-2xl border border-[#E6D8CC] space-y-4">
                <h4 className="font-serif text-lg font-bold text-[#2B2523]">
                  Share Your Craft Patron Feedback
                </h4>

                {reviewSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{reviewSuccess}</span>
                  </div>
                )}

                {reviewError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>{reviewError}</span>
                  </div>
                )}

                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                      Your Rating:
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setReviewRating(s)}
                          className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              s <= reviewRating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-[#E6D8CC]'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-[#2B2523] ml-2">
                        {reviewRating} out of 5 stars
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                      Your Review & Artisan Appreciation:
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Describe the craftsmanship, tactile texture, color vibrancy, and packing quality..."
                      className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl p-3 text-xs text-[#2B2523] placeholder-[#6F625D]/70 focus:bg-white focus:border-[#A63D40]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <span>{submittingReview ? 'Submitting...' : 'Submit Patron Review'}</span>
                  </button>
                </form>
              </div>

              {/* Reviews List */}
              <div className="space-y-4">
                <h4 className="font-serif text-lg font-bold text-[#2B2523]">
                  Customer Reviews ({reviewsList.length})
                </h4>

                {reviewsList.length > 0 ? (
                  <div className="space-y-3">
                    {reviewsList.map((rev, index) => {
                      const reviewerName = rev.user_name || rev.user?.name || rev.user?.username || 'Verified Patron';
                      const revRating = Number(rev.rating || 5);
                      const revDate = rev.created_at
                        ? new Date(rev.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Authentic Patron';

                      return (
                        <div
                          key={rev.id || index}
                          className="p-4 rounded-2xl bg-[#FFF9F3]/60 border border-[#E6D8CC] space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#C69A5B]/20 text-[#A63D40] flex items-center justify-center font-bold text-xs">
                                {reviewerName.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs font-bold text-[#2B2523]">
                                {reviewerName}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#6F625D]">{revDate}</span>
                          </div>

                          <div className="flex items-center gap-1 text-amber-500">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < revRating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-[#E6D8CC]'
                                }`}
                              />
                            ))}
                          </div>

                          <p className="text-xs text-[#2B2523] leading-relaxed">
                            {rev.comment}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-[#FFF9F3] rounded-2xl border border-[#E6D8CC]">
                    <p className="text-sm font-semibold text-[#2B2523]">No reviews yet.</p>
                    <p className="text-xs text-[#6F625D] mt-1">
                      Be the first patron to preserve your feedback on this authentic handcrafted piece.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ==========================================================
          4. SIMILAR HANDICRAFTS (RELATED PRODUCTS CAROUSEL/GRID)
          ========================================================== */}
      {relatedProducts.length > 0 && (
        <section className="craft-container pt-12 sm:pt-16">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#E6D8CC]">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#A63D40] block mb-0.5">
                Curated Suggestions
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2B2523]">
                Similar Handicrafts
              </h2>
            </div>
            <Link
              to={`/products?category=${encodeURIComponent(categoryName)}`}
              className="text-xs font-semibold text-[#A63D40] hover:underline"
            >
              Explore Category
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id || p._id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ==========================================================
          5. STICKY MOBILE BOTTOM ACTION BAR (REQUIRED FOR MOBILE)
          ========================================================== */}
      {canShop && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md border-t border-[#E6D8CC] p-3 px-4 shadow-xl flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#6F625D]">Price</span>
            <span className="font-serif text-lg font-bold text-[#A63D40]">
              ₹{effectivePrice.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-[240px]">
            <button
              type="button"
              disabled={!inStock || addingToCart}
              onClick={handleAddToCart}
              className="flex-1 inline-flex items-center justify-center gap-1 py-2.5 px-3 rounded-xl bg-[#FFF9F3] border border-[#A63D40] text-[#A63D40] font-semibold text-xs transition-colors disabled:opacity-40"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{addingToCart ? 'Added' : 'Add'}</span>
            </button>

            {inStock && (
              <button
                type="button"
                onClick={handleBuyNow}
                className="flex-1 inline-flex items-center justify-center gap-1 py-2.5 px-3 rounded-xl bg-[#A63D40] text-white font-semibold text-xs shadow-xs"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Buy Now</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductDetails() {
  const location = useLocation();
  const { user, isAuthenticated, isOwner, isSeller } = useAuth();
  const params = useParams();
  const id = params.id || params.productId;

  const isManagementRoute =
    location.pathname.startsWith('/owner/products') ||
    location.pathname.startsWith('/seller/products') ||
    location.pathname.startsWith('/admin/products');

  // Dedicated Product Management Detail Page specifically for Main Owner and Seller on management routes
  if (isAuthenticated && (isOwner || isSeller) && isManagementRoute) {
    return (
      <ProductManagementDetail
        productId={id}
        currentUser={user}
      />
    );
  }

  // Customer storefront purchasing/browsing interface
  return <CustomerProductDetails id={id} />;
}

