import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { Search, X, Sparkles, Filter, SlidersHorizontal, Check } from 'lucide-react';
import productsApi from '../api/products';
import ProductCard from '../components/common/ProductCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

export const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categorySlug } = useParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States: match category from query ?category= or path /category/:categorySlug
  const selectedCategory = useMemo(() => {
    if (categorySlug) {
      const decoded = decodeURIComponent(categorySlug).replace(/-/g, ' ');
      return decoded;
    }
    return searchParams.get('category') || 'All';
  }, [categorySlug, searchParams]);

  const searchQueryParam = searchParams.get('search') || searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(searchQueryParam);
  const [sortBy, setSortBy] = useState('featured');
  const [inStockOnly, setInStockOnly] = useState(false);

  // Sync search input with URL param
  useEffect(() => {
    setSearchInput(searchQueryParam);
  }, [searchQueryParam]);

  // Load products & categories from real backend APIs
  useEffect(() => {
    let isMounted = true;

    async function loadCatalog() {
      try {
        setLoading(true);
        setError(null);

        const [prodsData, catsData] = await Promise.all([
          productsApi.getProducts({ all: 'true' }),
          productsApi.getCategories(),
        ]);

        if (isMounted) {
          const list = Array.isArray(prodsData) ? prodsData : prodsData?.items || [];
          setProducts(list);
          setCategories(Array.isArray(catsData) ? catsData : []);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching catalog:', err);
          setError('Unable to load products from server. Please try again.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCategorySelect = (categoryName) => {
    const newParams = new URLSearchParams(searchParams);
    if (categoryName === 'All') {
      newParams.delete('category');
    } else {
      newParams.set('category', categoryName);
    }
    setSearchParams(newParams);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      newParams.set('search', searchInput.trim());
      newParams.delete('q');
    } else {
      newParams.delete('search');
      newParams.delete('q');
    }
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
    setSearchParams({});
    setSearchInput('');
    setSortBy('featured');
    setInStockOnly(false);
  };

  // Client-side filtering & sorting on real backend catalog
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category filter
        if (selectedCategory !== 'All') {
          const pCat = typeof p.category === 'string' ? p.category : p.category?.name;
          if (pCat !== selectedCategory) return false;
        }
        // Search filter
        if (searchQueryParam) {
          const q = searchQueryParam.toLowerCase();
          const matchName = (p.name || '').toLowerCase().includes(q);
          const matchDesc = (p.description || '').toLowerCase().includes(q);
          const pCat = typeof p.category === 'string' ? p.category : p.category?.name || '';
          const matchCat = pCat.toLowerCase().includes(q);
          const matchCreatedBy = (p.created_by || '').toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchCat && !matchCreatedBy) return false;
        }
        // In-stock filter
        if (inStockOnly && Number(p.stock) <= 0) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const priceA = Number(a.price || 0) * (1 - Number(a.discount || 0) / 100);
        const priceB = Number(b.price || 0) * (1 - Number(b.discount || 0) / 100);

        if (sortBy === 'price-low') return priceA - priceB;
        if (sortBy === 'price-high') return priceB - priceA;
        if (sortBy === 'rating') return Number(b.ratings || b.rating || 0) - Number(a.ratings || a.rating || 0);
        return 0; // Default featured order
      });
  }, [products, selectedCategory, searchQueryParam, inStockOnly, sortBy]);

  const hasActiveFilters = selectedCategory !== 'All' || searchQueryParam || inStockOnly;

  return (
    <div className="min-h-screen bg-[#FFF9F3]/40">
      <div className="craft-container py-6 sm:py-10">
        {/* ==============================================================
            1. PAGE HEADER: Refined atelier presentation with premium typography
            ============================================================== */}
        <div className="text-center max-w-3xl mx-auto space-y-2.5 mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E6D8CC] text-[#A63D40] text-[11px] font-bold tracking-widest uppercase shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#C69A5B]" />
            <span>Authenticated Indian Handicrafts</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#2B2523]">
            {selectedCategory !== 'All' ? selectedCategory : 'All Handcrafted Collections'}
          </h1>

          <p className="text-xs sm:text-sm text-[#6F625D] leading-relaxed max-w-xl mx-auto">
            Explore authentic hand-carved woodwork, heritage blue pottery, master handlooms, and traditional metalware sourced directly from accredited Indian artisan cooperatives.
          </p>
        </div>

        {/* Clean, subtle section boundary divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#E6D8CC] to-transparent mb-8 sm:mb-10" />

        {/* ==============================================================
            2. CATEGORY PILL NAVIGATION: Horizontal high-end carousel / tabs
            ============================================================== */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none flex-nowrap -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center">
            <button
              type="button"
              onClick={() => handleCategorySelect('All')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                selectedCategory === 'All'
                  ? 'bg-[#A63D40] text-white shadow-xs'
                  : 'bg-white text-[#2B2523] border border-[#E6D8CC] hover:bg-[#F4E8DC]/50 hover:text-[#A63D40]'
              }`}
            >
              <span>All Collections</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === 'All'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#F4E8DC] text-[#6F625D]'
                }`}
              >
                {products.length}
              </span>
            </button>

            {categories.map((c) => {
              const name = c.name || c.name_en;
              const isSelected = selectedCategory === name;
              const catCount = products.filter((p) => {
                const pCat = typeof p.category === 'string' ? p.category : p.category?.name;
                return pCat === name;
              }).length;

              return (
                <button
                  key={c.id || c._id || name}
                  type="button"
                  onClick={() => handleCategorySelect(name)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#A63D40] text-white shadow-xs'
                      : 'bg-white text-[#2B2523] border border-[#E6D8CC] hover:bg-[#F4E8DC]/50 hover:text-[#A63D40]'
                  }`}
                >
                  <span>{name}</span>
                  {catCount > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-[#F4E8DC] text-[#6F625D]'
                      }`}
                    >
                      {catCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ==============================================================
            3. TOOLBAR: Search, in-stock switch, sort dropdown & active chips
            ============================================================== */}
        <div className="bg-white rounded-2xl border border-[#E6D8CC] p-3 sm:p-4 mb-6 sm:mb-8 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Left: Search input */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search crafts by title, material, artisan, or motif..."
                className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2 pl-9 pr-8 text-xs text-[#2B2523] placeholder-[#8C7E77] focus:border-[#A63D40] focus:bg-white focus:outline-none transition-all"
              />
              <Search className="w-3.5 h-3.5 text-[#8C7E77] absolute left-3 top-1/2 -translate-y-1/2" />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('search');
                    newParams.delete('q');
                    setSearchParams(newParams);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C7E77] hover:text-[#2B2523] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {/* Right: In-stock toggle and Sort dropdown */}
            <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap">
              {/* In Stock toggle button */}
              <button
                type="button"
                onClick={() => setInStockOnly(!inStockOnly)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  inStockOnly
                    ? 'bg-[#A63D40] text-white border-[#A63D40] shadow-2xs'
                    : 'bg-[#FFF9F3] text-[#2B2523] border-[#E6D8CC] hover:bg-[#F4E8DC]'
                }`}
              >
                <Check className={`w-3.5 h-3.5 ${inStockOnly ? 'opacity-100' : 'opacity-0'}`} />
                <span>In Stock Only</span>
              </button>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[#8C7E77] font-medium hidden sm:inline">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl px-3 py-1.5 text-xs text-[#2B2523] font-medium focus:border-[#A63D40] focus:outline-none cursor-pointer"
                >
                  <option value="featured">Curated & Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Filter Chips & Summary */}
          <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[#E6D8CC]/60 flex-wrap text-xs">
            <span className="text-[#8C7E77] font-medium">
              Showing <strong className="text-[#2B2523]">{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'creation' : 'creations'}
            </span>

            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap ml-auto">
                {selectedCategory !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F4E8DC] text-[#2B2523] text-[11px] font-medium">
                    <span>{selectedCategory}</span>
                    <button
                      type="button"
                      onClick={() => handleCategorySelect('All')}
                      className="cursor-pointer hover:text-[#A63D40]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {searchQueryParam && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F4E8DC] text-[#2B2523] text-[11px] font-medium">
                    <span>"{searchQueryParam}"</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.delete('search');
                        newParams.delete('q');
                        setSearchParams(newParams);
                      }}
                      className="cursor-pointer hover:text-[#A63D40]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {inStockOnly && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F4E8DC] text-[#2B2523] text-[11px] font-medium">
                    <span>In Stock Only</span>
                    <button
                      type="button"
                      onClick={() => setInStockOnly(false)}
                      className="cursor-pointer hover:text-[#A63D40]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-[#A63D40] text-xs font-semibold hover:underline cursor-pointer ml-1"
                >
                  Reset All
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ==============================================================
            4. PRODUCT GRID: 5 columns on wide desktop (xl+), 3 on medium,
            2 on tablets, and 1-2 on mobile with consistent spacing
            ============================================================== */}
        {loading ? (
          <div className="py-24 flex justify-center">
            <LoadingSpinner label="Curating master artisan catalog..." size="lg" />
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 shadow-xs max-w-md mx-auto">
            <p className="text-sm text-[#B84242] mb-4">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-[#A63D40] text-white text-xs font-semibold hover:bg-[#8F3034] transition-colors cursor-pointer"
            >
              Reload Catalog
            </button>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-5 lg:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id || product._id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No handcrafted creations found"
            description="We could not find any artisan items matching your selected criteria. Try adjusting your search keywords or craft category filter."
            actionLabel="Reset All Filters"
            onAction={clearAllFilters}
          />
        )}
      </div>
    </div>
  );
};

export default Products;
