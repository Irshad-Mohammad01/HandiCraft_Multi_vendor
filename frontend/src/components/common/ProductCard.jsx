import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Star, Sparkles } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

export const ProductCard = ({ product, isOwnerView = false }) => {
  const navigate = useNavigate();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { isOwner, isSeller, isSubOwner } = useAuth();

  // Wishlist and Cart controls are strictly for patrons/customers
  const canShop = !isOwnerView && !isOwner && !isSeller && !isSubOwner;

  const [imgError, setImgError] = useState(false);
  const [adding, setAdding] = useState(false);

  if (!product) return null;

  const id = String(product.id || product._id);
  const inWishlist = isInWishlist ? isInWishlist(id) : false;

  const price = Number(product.price || 0);
  const discount = Number(product.discount || 0);
  const effectivePrice = discount > 0 ? Math.round(price * (1 - discount / 100)) : price;

  const rawImages = product.images || (product.image ? [product.image] : []);
  let primaryImage = null;
  if (Array.isArray(rawImages) && rawImages.length > 0) {
    const first = rawImages[0];
    primaryImage = typeof first === 'string' ? first : first?.image_url;
  }
  if (!primaryImage && product.image_url) {
    primaryImage = product.image_url;
  }
  const displayImage = primaryImage || 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80';

  const inStock = product.stock === undefined || Number(product.stock) > 0;
  const ratingValue = Number(product.ratings || product.rating || 4.8).toFixed(1);
  const reviewsCount = product.review_count !== undefined 
    ? product.review_count 
    : (Array.isArray(product.reviews) ? product.reviews.length : 0);

  const categoryName = typeof product.category === 'string'
    ? product.category
    : (product.category?.name || product.category_name || 'Artisan Heritage');

  const shortDescription = product.description || product.description_en || product.specifications || 'Master artisan handcrafted creation reflecting generational heritage craft traditions.';

  const handleCardClick = (e) => {
    // Only navigate to product detail page if clicked outside interactive action buttons
    if (e.target.closest('button')) {
      return;
    }
    navigate(`/products/${id}`);
  };

  const handleWishlistClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (toggleWishlist) {
      toggleWishlist(product);
    }
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!inStock || adding || !addToCart) return;
    setAdding(true);
    try {
      await addToCart(product, 1);
    } finally {
      setTimeout(() => setAdding(false), 600);
    }
  };

  return (
    <article
      onClick={handleCardClick}
      className={`group relative flex flex-col h-full bg-white rounded-2xl border border-[#EBDCD0]/90 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_25px_-5px_rgba(43,37,35,0.08)] hover:border-[#C69A5B]/40 cursor-pointer ${
        isOwnerView ? 'border-dashed' : ''
      }`}
    >
      {/* 1. PRODUCT IMAGE CONTAINER: Clean neutral background, consistent square aspect ratio & object-contain */}
      <div className="relative aspect-square w-full bg-[#FAF7F2] p-2.5 sm:p-4 flex items-center justify-center overflow-hidden border-b border-[#F0E6DC]/70">
        {!imgError ? (
          <img
            src={displayImage}
            alt={product.name || 'Handcrafted Artisan Item'}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-contain object-center transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-2 sm:p-4 text-[#8C7E77] w-full h-full select-none">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center mb-1 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C69A5B]" />
            </div>
            <span className="font-serif text-[10px] sm:text-[11px] font-semibold text-[#2B2523] tracking-wide">CraftNest Atelier</span>
            <span className="text-[8px] sm:text-[9px] text-[#A63D40] uppercase tracking-wider font-medium">Heritage</span>
          </div>
        )}

        {/* Discount Badge */}
        {discount > 0 && inStock && (
          <span className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 bg-[#A63D40] text-white text-[9px] sm:text-[10px] font-bold tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full uppercase shadow-xs">
            {discount}% OFF
          </span>
        )}

        {/* Sold Out / Stock Status Badge */}
        {!inStock && (
          <span className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 bg-[#6F625D] text-white text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full uppercase shadow-xs">
            Sold Out
          </span>
        )}

        {/* Wishlist Button: Customer Only */}
        {canShop && (
          <button
            type="button"
            onClick={handleWishlistClick}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`absolute top-2 right-2 sm:top-2.5 sm:right-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-xs cursor-pointer ${
              inWishlist
                ? 'bg-white text-[#A63D40] ring-1 ring-[#A63D40]/40'
                : 'bg-white/90 text-[#6F625D] hover:bg-white hover:text-[#A63D40]'
            }`}
          >
            <Heart className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${inWishlist ? 'fill-[#A63D40]' : ''}`} />
          </button>
        )}
      </div>

      {/* CARD BODY: STRICT PRODUCT INFORMATION HIERARCHY */}
      <div className="flex flex-col flex-grow p-2.5 sm:p-4">
        {/* 2. Category name in small, elegant uppercase text */}
        <span className="text-[9px] sm:text-[11px] font-bold tracking-widest uppercase text-[#C69A5B] truncate mb-0.5 sm:mb-1">
          {categoryName}
        </span>

        {/* 3. Product name with clear readable typography */}
        <h3 className="font-serif text-xs sm:text-[15px] font-semibold text-[#2B2523] line-clamp-1 leading-snug group-hover:text-[#A63D40] transition-colors mb-1 sm:mb-1.5">
          {product.name}
        </h3>

        {/* 4. Rating and review count */}
        <div className="flex items-center gap-1 sm:gap-1.5 mb-1.5 sm:mb-2 text-[11px] sm:text-xs">
          <div className="flex items-center text-amber-500">
            <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-400" />
          </div>
          <span className="font-semibold text-[#2B2523] text-[11px] sm:text-xs">{ratingValue}</span>
          <span className="text-[#8C7E77] text-[10px] sm:text-[11px] truncate">
            ({reviewsCount > 0 ? `${reviewsCount}` : 'Artisan'})
          </span>
        </div>

        {/* 5. Short description, limited to a few lines on desktop, hidden on compact mobile to maintain equal heights */}
        <p className="hidden sm:line-clamp-2 text-xs text-[#6F625D] leading-relaxed mb-3 min-h-[2rem]">
          {shortDescription}
        </p>

        {/* 6. Selling price prominently & 7. Original price with strikethrough & discount */}
        <div className="mt-auto pt-2 sm:pt-3 border-t border-[#F0E6DC] flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex flex-col min-w-0">
            <div className="flex items-baseline gap-1 sm:gap-1.5 flex-wrap">
              <span className="font-serif text-sm sm:text-lg font-bold text-[#2B2523]">
                ₹{effectivePrice.toLocaleString('en-IN')}
              </span>
              {discount > 0 && (
                <span className="text-[10px] sm:text-xs text-[#8C7E77] line-through">
                  ₹{price.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            {discount > 0 && (
              <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-700 tracking-wide truncate">
                Save {discount}%
              </span>
            )}
          </div>

          {/* Cart Control: Customer Only */}
          {canShop && (
            <button
              type="button"
              disabled={!inStock || adding}
              onClick={handleAddToCart}
              aria-label="Add to Cart"
              className="inline-flex items-center justify-center gap-1 sm:gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-[#FFF9F3] text-[#2B2523] border border-[#E6D8CC] hover:bg-[#A63D40] hover:text-white hover:border-[#A63D40] text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{adding ? 'Added' : 'Add'}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
