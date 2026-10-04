import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Award,
  Truck,
  RotateCcw,
  Compass,
  CheckCircle2,
  Package,
  ExternalLink,
  Users,
  Store,
  BarChart3,
  Search,
  Filter,
  Eye,
  Database,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Mail,
  Phone,
  Calendar,
  Check,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import bannersApi from '../api/banners';
import productsApi from '../api/products';
import { adminApi } from '../api/admin';
import ProductCard from '../components/common/ProductCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AdminOwnerBar from '../components/admin/AdminOwnerBar';
import { formatPrice } from '../utils/priceFormatter';

export const Home = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isOwner, isSeller } = useAuth();
  const { settings } = useSettings();
  const isOwnerOrSeller = Boolean(isOwner || isSeller);

  const urlTab = searchParams.get('tab');
  const validTabs = ['products', 'users', 'sellers', 'analytics'];
  const [homeAdminTab, setHomeAdminTab] = useState(() => {
    if (urlTab && validTabs.includes(urlTab)) {
      return urlTab;
    }
    return null;
  });

  const [adminProducts, setAdminProducts] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminSellers, setAdminSellers] = useState([]);
  const [adminDatabases, setAdminDatabases] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [adminDataLoading, setAdminDataLoading] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState('');

  // Synchronize active tab with URL query parameter on direct navigation or browser back/forward
  useEffect(() => {
    if (isOwner && urlTab && validTabs.includes(urlTab)) {
      setHomeAdminTab(urlTab);
    } else if (isOwner && !urlTab && homeAdminTab !== null) {
      setHomeAdminTab(null);
    }
  }, [urlTab, isOwner]);

  const handleAdminTabChange = (tabId) => {
    const nextTab = homeAdminTab === tabId ? null : tabId;
    setHomeAdminTab(nextTab);
    setAdminSearch('');
    setAdminCategoryFilter('');
    if (nextTab) {
      setSearchParams({ tab: nextTab });
    } else {
      setSearchParams({});
    }
  };

  const [banners, setBanners] = useState([]);
  const [secondaryBanners, setSecondaryBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadHomeData() {
      try {
        setLoading(true);
        const [heroBannersData, secondaryBannersData, categoriesData, productsData] =
          await Promise.all([
            bannersApi.getBanners({ location: 'homepage_hero' }).catch(() => []),
            bannersApi.getBanners({ location: 'homepage_secondary' }).catch(() => []),
            productsApi.getCategories().catch(() => []),
            productsApi.getProducts({ limit: 10, homepage_only: 'true' }).catch(() => []),
          ]);

        if (isMounted) {
          let heroList = Array.isArray(heroBannersData) ? heroBannersData : [];
          // If no banners with location 'homepage_hero', fallback to general active banners
          if (heroList.length === 0) {
            const allActive = await bannersApi.getBanners().catch(() => []);
            heroList = Array.isArray(allActive) ? allActive : [];
          }
          setBanners(heroList);
          setSecondaryBanners(Array.isArray(secondaryBannersData) ? secondaryBannersData : []);
          setCategories(Array.isArray(categoriesData) ? categoriesData : []);
          const prods = Array.isArray(productsData)
            ? productsData
            : productsData?.items || [];
          setFeaturedProducts(prods);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load homepage data:', err);
          setError('Unable to load catalog data from the server.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadHomeData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch live administrative data when Main Owner is authenticated
  const loadOwnerAdminData = useCallback(async () => {
    if (!isOwner) return;
    setAdminDataLoading(true);
    try {
      const [prodsRes, usersRes, sellersRes, dbRes, statsRes] = await Promise.allSettled([
        productsApi.getAll({ all: 'true' }).catch(() => productsApi.getProducts({ all: 'true' })),
        adminApi.getUsers ? adminApi.getUsers() : adminApi.getCustomers(),
        adminApi.getSellers(),
        adminApi.getDatabases(),
        adminApi.getStats(),
      ]);

      if (prodsRes.status === 'fulfilled') {
        const pList = prodsRes.value?.products || prodsRes.value?.items || prodsRes.value || [];
        setAdminProducts(Array.isArray(pList) ? pList : []);
      }
      if (usersRes.status === 'fulfilled') {
        const uList = usersRes.value?.users || usersRes.value?.customers || usersRes.value || [];
        setAdminUsers(Array.isArray(uList) ? uList : []);
      }
      if (sellersRes.status === 'fulfilled') {
        const sList = sellersRes.value?.sellers || sellersRes.value || [];
        setAdminSellers(Array.isArray(sList) ? sList : []);
      }
      if (dbRes.status === 'fulfilled') {
        const dList = dbRes.value?.databases || dbRes.value || [];
        setAdminDatabases(Array.isArray(dList) ? dList : []);
      }
      if (statsRes.status === 'fulfilled') {
        setAdminStats(statsRes.value);
      }
    } catch (err) {
      console.error('Failed to load owner admin overview data on homepage:', err);
    } finally {
      setAdminDataLoading(false);
    }
  }, [isOwner]);

  useEffect(() => {
    if (isOwner) {
      loadOwnerAdminData();
    }
  }, [isOwner, loadOwnerAdminData]);

  // Banner Carousel auto-advance
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const nextBanner = () => {
    if (banners.length > 0) {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }
  };

  const prevBanner = () => {
    if (banners.length > 0) {
      setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner label="Discovering authentic Indian handicrafts..." size="lg" />
      </div>
    );
  }

  const activeBanner = banners[currentBannerIndex] || {
    title: 'Timeless Indian Craftsmanship',
    subtitle: 'Direct From Master Artisans',
    description: 'Explore authentic handcrafted blue pottery, brass lamps, handloom weaves, and seasoned wood carvings.',
    button_text: 'Explore Catalog',
    button_link: '/products',
    image_url:
      'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1800&q=80',
  };

  const filteredAdminProducts = adminProducts.filter((p) => {
    const q = adminSearch.toLowerCase().trim();
    const pName = (p.name || '').toLowerCase();
    const pArtisan = (p.artisan_name || '').toLowerCase();
    const pCategory = (typeof p.category === 'string' ? p.category : (p.category?.name || p.category_name || '')).toLowerCase();
    const pId = String(p.id || p._id || '');

    const matchesSearch = !q || pName.includes(q) || pArtisan.includes(q) || pCategory.includes(q) || pId.includes(q);

    const catVal = adminCategoryFilter;
    const pCatId = String(p.category_id || p.category?.id || '');
    const matchesCat = !catVal || pCatId === String(catVal) || pCategory === catVal.toLowerCase();

    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-12 sm:space-y-16 lg:space-y-20 pb-16">
      {/* ==========================================================
          1. HERO BANNER SECTION (WIDE DESKTOP + SEPARATE MOBILE COMPOSITION)
          ========================================================== */}
      <section className="craft-container pt-3 sm:pt-4">
        {/* DESKTOP HERO BANNER COMPOSITION (hidden on small mobile) */}
        <div className="hidden sm:flex relative rounded-3xl overflow-hidden bg-[#2B2523] min-h-[460px] lg:min-h-[520px] xl:min-h-[560px] items-center border border-[#E6D8CC] shadow-md">
      {/* Banner Background Image with Craft Terracotta Vignette Overlay */}
      <div className="absolute inset-0">
        <img
          src={activeBanner.image_url}
          alt={activeBanner.title}
          className="w-full h-full object-cover object-center brightness-70 transition-opacity duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2B2523]/95 via-[#2B2523]/70 to-transparent" />
      </div>

      {/* Banner Editorial Copy */}
      <div className="relative z-10 p-8 lg:p-14 xl:p-16 max-w-2xl text-white space-y-4 sm:space-y-5">
        {activeBanner.subtitle && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#A63D40]/90 text-[#FFF9F3] text-xs font-semibold uppercase tracking-widest border border-[#C69A5B]/40">
            <Sparkles className="w-3.5 h-3.5 text-[#C69A5B]" />
            {activeBanner.subtitle}
          </span>
        )}
        <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-[1.15] tracking-tight text-[#FFF9F3]">
          {activeBanner.title}
        </h1>
        <p className="text-sm md:text-base text-[#F4E8DC] leading-relaxed max-w-xl line-clamp-3">
          {activeBanner.description}
        </p>
        <div className="pt-2 flex items-center gap-4">
          <Link
            to={activeBanner.button_link || '/products'}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#A63D40] text-white hover:bg-[#8F3034] text-sm font-semibold shadow-md hover:shadow-lg transition-all"
          >
            <span>{activeBanner.button_text || 'Explore Collection'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/about"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-[#FFF9F3] text-xs font-semibold border border-white/20 backdrop-blur-xs transition-colors"
          >
            <span>Artisan Heritage</span>
          </Link>
        </div>
      </div>

      {/* Carousel Navigation Arrows */}
      {banners.length > 1 && (
        <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={prevBanner}
            aria-label="Previous Slide"
            className="p-3 rounded-full bg-black/50 text-white hover:bg-[#A63D40] border border-white/20 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={nextBanner}
            aria-label="Next Slide"
            className="p-3 rounded-full bg-black/50 text-white hover:bg-[#A63D40] border border-white/20 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>

    {/* MOBILE SPECIFIC HERO COMPOSITION (Shown on mobile screens < 640px) */}
    <div className="sm:hidden flex flex-col rounded-2xl overflow-hidden bg-[#2B2523] border border-[#E6D8CC] shadow-md">
      {/* Mobile Image Container */}
      <div className="relative aspect-16/10 w-full overflow-hidden">
        <img
          src={activeBanner.mobile_image_url || activeBanner.image_url}
          alt={activeBanner.title}
          className="w-full h-full object-cover object-center brightness-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2B2523] via-transparent to-black/30" />
        
        {activeBanner.subtitle && (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#A63D40] text-[#FFF9F3] text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-[#C69A5B]" />
              {activeBanner.subtitle}
            </span>
          </div>
        )}

        {banners.length > 1 && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-10">
            <button
              type="button"
              onClick={prevBanner}
              aria-label="Previous Slide"
              className="p-2 rounded-full bg-black/60 text-white border border-white/20"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={nextBanner}
              aria-label="Next Slide"
              className="p-2 rounded-full bg-black/60 text-white border border-white/20"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile Content Details */}
      <div className="p-5 text-white space-y-3 bg-[#2B2523]">
        <h1 className="font-serif text-2xl font-bold leading-tight text-[#FFF9F3]">
          {activeBanner.title}
        </h1>
        <p className="text-xs text-[#F4E8DC] leading-relaxed line-clamp-2">
          {activeBanner.description}
        </p>
        <div className="pt-1">
          <Link
            to={activeBanner.button_link || '/products'}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs font-semibold shadow-xs"
          >
            <span>{activeBanner.button_text || 'Explore Collection'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  </section>

      {/* ==========================================================
          ADMIN / OWNER AREA (Shown when logged in as Main Owner)
          Immediately below the homepage hero/banner section
          ========================================================== */}
      {isOwner && (
        <section className="craft-container">
          <AdminOwnerBar
            activeTab={homeAdminTab}
            onTabChange={handleAdminTabChange}
          />

          {/* ======================================================
              TAB 1: ALL PRODUCTS (MARKETPLACE CATALOG)
              ====================================================== */}
          {homeAdminTab === 'products' && (
            <div className="bg-white rounded-2xl border border-[#E6D8CC] p-4 sm:p-6 shadow-xs mb-8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6D8CC]">
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-[#2B2523] flex items-center gap-2">
                    <Package className="w-5 h-5 text-[#A63D40]" />
                    Platform Product Catalog (Handicraft Inventory)
                  </h3>
                  <p className="text-xs text-[#6F625D] mt-0.5">
                    Curate, price, monitor inventory stock, and oversee craft listings across regional clusters
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={loadOwnerAdminData}
                    disabled={adminDataLoading}
                    className="p-2 rounded-xl border border-[#E6D8CC] bg-[#FFF9F3] hover:bg-[#F4E8DC] text-[#2B2523] transition-colors cursor-pointer"
                    title="Refresh Products"
                  >
                    <RefreshCw className={`w-4 h-4 ${adminDataLoading ? 'animate-spin text-[#A63D40]' : ''}`} />
                  </button>
                  <Link
                    to="/owner/products"
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#A63D40] hover:text-[#8F3034] transition-colors"
                  >
                    <span>Open Full Products Studio</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#FFF9F3] p-3 rounded-xl border border-[#E6D8CC]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#6F625D] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by craft title, artisan, category, or product ID..."
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    className="w-full bg-white border border-[#E6D8CC] rounded-lg py-1.5 pl-9 pr-3 text-xs text-[#2B2523] focus:border-[#A63D40] outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#6F625D] shrink-0" />
                  <select
                    value={adminCategoryFilter}
                    onChange={(e) => setAdminCategoryFilter(e.target.value)}
                    className="bg-white border border-[#E6D8CC] rounded-lg py-1.5 px-2.5 text-xs text-[#2B2523] focus:border-[#A63D40] outline-none"
                  >
                    <option value="">All Craft Categories</option>
                    {categories.map((c) => (
                      <option key={c.id || c._id || c.name} value={c.name || c.id}>
                        {c.name || c.name_en}
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-[11px] font-semibold text-[#6F625D] whitespace-nowrap bg-white px-3 py-1.5 rounded-lg border border-[#E6D8CC]">
                  {filteredAdminProducts.length} craft products
                </span>
              </div>

              {/* Products Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#FFF9F3] border-b border-[#E6D8CC] text-[#2B2523] font-semibold">
                      <th className="py-2.5 px-3">Craft & Title</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Artisan / Guild</th>
                      <th className="py-2.5 px-3">Price</th>
                      <th className="py-2.5 px-3 text-center">Inventory Stock</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6D8CC]/70">
                    {filteredAdminProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#6F625D]">
                          <Package className="w-8 h-8 text-[#C69A5B] mx-auto mb-2" />
                          <p className="font-semibold text-sm text-[#2B2523]">No craft products found.</p>
                          <p className="text-xs text-[#6F625D] mt-0.5">Try adjusting your search criteria or resetting filters.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredAdminProducts.map((p) => {
                        const pId = String(p.id || p._id);
                        const pImage = (p.images && p.images[0]) || p.image_url || 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=200&q=80';
                        const pCategory = typeof p.category === 'string' ? p.category : (p.category?.name || p.category_name || 'Handicraft');
                        const stockNum = parseInt(p.stock ?? 0, 10);
                        const isOutOfStock = stockNum <= 0;
                        const isLowStock = stockNum > 0 && stockNum <= 5;

                        return (
                          <tr key={pId} className="hover:bg-[#FFF9F3]/60 transition-colors">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#FFF9F3] border border-[#E6D8CC] shrink-0">
                                  <img
                                    src={pImage}
                                    alt={p.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.src = 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=200&q=80';
                                    }}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-semibold text-[#2B2523] block truncate max-w-[220px] sm:max-w-[280px]">
                                    {p.name}
                                  </span>
                                  <span className="text-[10px] text-[#6F625D] font-mono">
                                    ID #{pId}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF9F3] text-[#2B2523] border border-[#E6D8CC]">
                                {pCategory}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-[#2B2523] font-medium text-xs">
                              {p.artisan_name || 'Hereditary Artisan Guild'}
                            </td>
                            <td className="py-3 px-3 font-semibold text-xs text-[#A63D40]">
                              {formatPrice(p.price)}
                              {p.original_price && p.original_price > p.price && (
                                <span className="text-[10px] text-[#6F625D] line-through ml-1.5 font-normal">
                                  {formatPrice(p.original_price)}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] inline-flex items-center gap-1 ${
                                isOutOfStock
                                  ? 'bg-[#B84242]/10 text-[#B84242]'
                                  : isLowStock
                                  ? 'bg-[#C69A5B]/15 text-[#9C6D28]'
                                  : 'bg-[#3F7D5A]/10 text-[#3F7D5A]'
                              }`}>
                                {isOutOfStock ? 'Out of Stock' : `${stockNum} units (${isLowStock ? 'Low' : 'In Stock'})`}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <Link
                                  to={`/products/${pId}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E6D8CC] text-xs font-semibold hover:bg-[#FFF9F3] text-[#2B2523] transition-colors"
                                  title="View on Storefront"
                                >
                                  <Eye className="w-3 h-3 text-[#6F625D]" />
                                  <span className="hidden sm:inline">View</span>
                                </Link>
                                <Link
                                  to="/owner/products"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#A63D40]/30 text-xs font-semibold bg-[#A63D40] text-white hover:bg-[#8F3034] transition-colors"
                                  title="Manage in Full Studio"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Manage</span>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================
              TAB 2: USERS DATA (CUSTOMERS / PATRONS)
              ====================================================== */}
          {homeAdminTab === 'users' && (
            <div className="bg-white rounded-2xl border border-[#E6D8CC] p-4 sm:p-6 shadow-xs mb-8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6D8CC]">
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-[#2B2523] flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#A63D40]" />
                    Registered Users & Patrons Data (Neon PostgreSQL)
                  </h3>
                  <p className="text-xs text-[#6F625D] mt-0.5">
                    Customer records, registered contact credentials, and verified delivery locations
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={loadOwnerAdminData}
                    disabled={adminDataLoading}
                    className="p-2 rounded-xl border border-[#E6D8CC] bg-[#FFF9F3] hover:bg-[#F4E8DC] text-[#2B2523] transition-colors cursor-pointer"
                    title="Refresh Users"
                  >
                    <RefreshCw className={`w-4 h-4 ${adminDataLoading ? 'animate-spin text-[#A63D40]' : ''}`} />
                  </button>
                  <Link
                    to="/owner/customers"
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#A63D40] hover:text-[#8F3034] transition-colors"
                  >
                    <span>Open Customer Directory</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#FFF9F3] p-3 rounded-xl border border-[#E6D8CC]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#6F625D] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by patron name, email, or mobile..."
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    className="w-full bg-white border border-[#E6D8CC] rounded-lg py-1.5 pl-9 pr-3 text-xs text-[#2B2523] focus:border-[#A63D40] outline-none"
                  />
                </div>
                <span className="text-[11px] font-semibold text-[#6F625D] whitespace-nowrap bg-white px-3 py-1.5 rounded-lg border border-[#E6D8CC]">
                  {adminUsers.filter((u) => {
                    const q = adminSearch.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      (u.name && u.name.toLowerCase().includes(q)) ||
                      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
                      (u.username && u.username.toLowerCase().includes(q)) ||
                      (u.email && u.email.toLowerCase().includes(q)) ||
                      (u.mobile && u.mobile.includes(q)) ||
                      (u.phone && u.phone.includes(q)) ||
                      String(u.id).includes(q)
                    );
                  }).length} registered patrons
                </span>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#FFF9F3] border-b border-[#E6D8CC] text-[#2B2523] font-semibold">
                      <th className="py-2.5 px-3">Patron Name</th>
                      <th className="py-2.5 px-3">Email Address</th>
                      <th className="py-2.5 px-3">Contact</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3">Registered On</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6D8CC]/70">
                    {adminUsers
                      .filter((u) => {
                        const q = adminSearch.toLowerCase().trim();
                        if (!q) return true;
                        return (
                          (u.name && u.name.toLowerCase().includes(q)) ||
                          (u.full_name && u.full_name.toLowerCase().includes(q)) ||
                          (u.username && u.username.toLowerCase().includes(q)) ||
                          (u.email && u.email.toLowerCase().includes(q)) ||
                          (u.mobile && u.mobile.includes(q)) ||
                          (u.phone && u.phone.includes(q)) ||
                          String(u.id).includes(q)
                        );
                      })
                      .map((u) => {
                        const displayName = u.name || u.full_name || u.username || 'Patron';
                        const city = u.address?.city || '';
                        const state = u.address?.state || '';
                        const loc = [city, state].filter(Boolean).join(', ') || 'India';
                        const regDate = u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : 'Active Member';

                        return (
                          <tr key={u.id} className="hover:bg-[#FFF9F3]/60 transition-colors">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-[#A63D40] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                  {displayName.charAt(0)}
                                </div>
                                <div>
                                  <span className="font-semibold text-[#2B2523] block">{displayName}</span>
                                  <span className="text-[10px] text-[#6F625D] font-mono">User #{u.id}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono text-xs text-[#2B2523]">
                              {u.email}
                            </td>
                            <td className="py-3 px-3 text-[#6F625D]">
                              {u.mobile || u.phone || '—'}
                            </td>
                            <td className="py-3 px-3 text-[#6F625D]">
                              {loc}
                            </td>
                            <td className="py-3 px-3 text-[#6F625D]">
                              {regDate}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                                u.is_blocked ? 'bg-[#B84242]/10 text-[#B84242]' : 'bg-[#3F7D5A]/10 text-[#3F7D5A]'
                              }`}>
                                {u.is_blocked ? 'Blocked' : 'Active'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <Link
                                to="/owner/customers"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E6D8CC] text-xs font-semibold hover:bg-[#A63D40] hover:text-white transition-colors"
                              >
                                <span>Manage</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================
              TAB 3: SELLERS DATA (ARTISANS & GUILDS)
              Associated Database column completely removed!
              ====================================================== */}
          {homeAdminTab === 'sellers' && (
            <div className="bg-white rounded-2xl border border-[#E6D8CC] p-4 sm:p-6 shadow-xs mb-8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6D8CC]">
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-[#2B2523] flex items-center gap-2">
                    <Store className="w-5 h-5 text-[#A63D40]" />
                    Registered Sellers & Artisan Guilds
                  </h3>
                  <p className="text-xs text-[#6F625D] mt-0.5">
                    Artisan accounts, seller IDs, business names, status, and active crafts catalog summary
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={loadOwnerAdminData}
                    disabled={adminDataLoading}
                    className="p-2 rounded-xl border border-[#E6D8CC] bg-[#FFF9F3] hover:bg-[#F4E8DC] text-[#2B2523] transition-colors cursor-pointer"
                    title="Refresh Sellers"
                  >
                    <RefreshCw className={`w-4 h-4 ${adminDataLoading ? 'animate-spin text-[#A63D40]' : ''}`} />
                  </button>
                  <Link
                    to="/owner/sellers"
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#A63D40] hover:text-[#8F3034] transition-colors"
                  >
                    <span>Open Artisan Management</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#FFF9F3] p-3 rounded-xl border border-[#E6D8CC]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#6F625D] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by artisan name, guild, email, or seller ID..."
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    className="w-full bg-white border border-[#E6D8CC] rounded-lg py-1.5 pl-9 pr-3 text-xs text-[#2B2523] focus:border-[#A63D40] outline-none"
                  />
                </div>
                <span className="text-[11px] font-semibold text-[#6F625D] whitespace-nowrap bg-white px-3 py-1.5 rounded-lg border border-[#E6D8CC]">
                  {adminSellers.filter((s) => {
                    const q = adminSearch.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      (s.name && s.name.toLowerCase().includes(q)) ||
                      (s.business_name && s.business_name.toLowerCase().includes(q)) ||
                      (s.email && s.email.toLowerCase().includes(q)) ||
                      (s.mobile && s.mobile.includes(q)) ||
                      (s.phone && s.phone.includes(q)) ||
                      String(s.id || s._id).includes(q)
                    );
                  }).length} registered sellers
                </span>
              </div>

              {/* Sellers Table (Associated Database column removed) */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#FFF9F3] border-b border-[#E6D8CC] text-[#2B2523] font-semibold">
                      <th className="py-2.5 px-3">Seller ID</th>
                      <th className="py-2.5 px-3">Artisan / Guild Name</th>
                      <th className="py-2.5 px-3">Contact Email</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Crafts / Orders</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6D8CC]/70">
                    {adminSellers
                      .filter((s) => {
                        const q = adminSearch.toLowerCase().trim();
                        if (!q) return true;
                        return (
                          (s.name && s.name.toLowerCase().includes(q)) ||
                          (s.business_name && s.business_name.toLowerCase().includes(q)) ||
                          (s.email && s.email.toLowerCase().includes(q)) ||
                          (s.mobile && s.mobile.includes(q)) ||
                          (s.phone && s.phone.includes(q)) ||
                          String(s.id || s._id).includes(q)
                        );
                      })
                      .map((s) => {
                        const sId = String(s.id || s._id);

                        return (
                          <tr key={sId} className="hover:bg-[#FFF9F3]/60 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-[#A63D40]">
                              #{sId}
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-semibold text-[#2B2523] block">{s.name}</span>
                              {s.business_name && s.business_name !== s.name && (
                                <span className="text-[11px] text-[#6F625D]">{s.business_name}</span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono text-xs text-[#2B2523]">
                              {s.email}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                                s.is_blocked ? 'bg-[#B84242]/10 text-[#B84242]' : 'bg-[#3F7D5A]/10 text-[#3F7D5A]'
                              }`}>
                                {s.is_blocked ? 'Inactive' : 'Active'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center text-xs font-semibold text-[#2B2523]">
                              <span className="text-[#A63D40]">{s.products_count ?? 0}</span> crafts • <span className="text-[#3F7D5A]">{s.orders_count ?? 0}</span> orders
                            </td>
                            <td className="py-3 px-3 text-right">
                              <Link
                                to={`/owner/sellers/${sId}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E6D8CC] text-xs font-semibold hover:bg-[#A63D40] hover:text-white transition-colors"
                              >
                                <span>Details</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================
              TAB 4: ADMIN ANALYTICS
              ====================================================== */}
          {homeAdminTab === 'analytics' && (
            <div className="bg-white rounded-2xl border border-[#E6D8CC] p-4 sm:p-6 shadow-xs mb-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6D8CC]">
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-[#2B2523] flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#A63D40]" />
                    Marketplace Executive Analytics (Neon PostgreSQL)
                  </h3>
                  <p className="text-xs text-[#6F625D] mt-0.5">
                    Live operational metrics across platform sales, orders, catalog products, customers, and artisan guilds
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={loadOwnerAdminData}
                    disabled={adminDataLoading}
                    className="p-2 rounded-xl border border-[#E6D8CC] bg-[#FFF9F3] hover:bg-[#F4E8DC] text-[#2B2523] transition-colors cursor-pointer"
                    title="Refresh Analytics"
                  >
                    <RefreshCw className={`w-4 h-4 ${adminDataLoading ? 'animate-spin text-[#A63D40]' : ''}`} />
                  </button>
                  <Link
                    to="/owner/reports"
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#A63D40] hover:text-[#8F3034] transition-colors"
                  >
                    <span>Open Financial Reports</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* 5-Metric Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* 1. Gross Revenue */}
                <div className="bg-[#FFF9F3] p-4 rounded-xl border border-[#E6D8CC]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#6F625D]">Gross Platform Sales</span>
                    <div className="w-7 h-7 rounded-lg bg-[#C69A5B]/20 text-[#C69A5B] flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="font-serif text-xl sm:text-2xl font-bold text-[#A63D40]">
                    ₹{Number(adminStats?.total_sales ?? adminStats?.total_revenue ?? 0).toLocaleString('en-IN')}
                  </div>
                  <span className="text-[11px] text-[#3F7D5A] font-medium mt-1 block">Verified payments</span>
                </div>

                {/* 2. Total Orders */}
                <div className="bg-[#FFF9F3] p-4 rounded-xl border border-[#E6D8CC]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#6F625D]">Total Orders</span>
                    <div className="w-7 h-7 rounded-lg bg-[#A63D40]/15 text-[#A63D40] flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="font-serif text-xl sm:text-2xl font-bold text-[#2B2523]">
                    {adminStats?.total_orders ?? 0}
                  </div>
                  <span className="text-[11px] text-[#6F625D] font-medium mt-1 block">
                    {adminStats?.pending_orders ?? 0} active in fulfillment
                  </span>
                </div>

                {/* 3. Catalog Products */}
                <div className="bg-[#FFF9F3] p-4 rounded-xl border border-[#E6D8CC]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#6F625D]">Live Catalog Products</span>
                    <div className="w-7 h-7 rounded-lg bg-[#3F7D5A]/15 text-[#3F7D5A] flex items-center justify-center">
                      <Package className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="font-serif text-xl sm:text-2xl font-bold text-[#2B2523]">
                    {adminStats?.total_products ?? adminProducts.length ?? 0}
                  </div>
                  <span className="text-[11px] text-[#B84242] font-medium mt-1 block">
                    {adminStats?.low_stock_products_count ?? 0} low stock alerts
                  </span>
                </div>

                {/* 4. Registered Patrons */}
                <div className="bg-[#FFF9F3] p-4 rounded-xl border border-[#E6D8CC]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#6F625D]">Registered Patrons</span>
                    <div className="w-7 h-7 rounded-lg bg-[#6B4E71]/15 text-[#6B4E71] flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="font-serif text-xl sm:text-2xl font-bold text-[#2B2523]">
                    {adminStats?.total_customers ?? adminUsers.length ?? 0}
                  </div>
                  <span className="text-[11px] text-[#3F7D5A] font-medium mt-1 block">Active patrons</span>
                </div>

                {/* 5. Registered Sellers */}
                <div className="bg-[#FFF9F3] p-4 rounded-xl border border-[#E6D8CC]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#6F625D]">Artisan Sellers</span>
                    <div className="w-7 h-7 rounded-lg bg-[#2980B9]/15 text-[#2980B9] flex items-center justify-center">
                      <Store className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="font-serif text-xl sm:text-2xl font-bold text-[#2B2523]">
                    {adminStats?.total_sellers ?? adminSellers.length ?? 0}
                  </div>
                  <span className="text-[11px] text-[#2980B9] font-medium mt-1 block">Active artisan guilds</span>
                </div>
              </div>

              {/* Platform Operational & Multi-Database Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-[#E6D8CC] bg-[#FFF9F3]">
                  <h4 className="font-serif font-bold text-sm text-[#2B2523] mb-2 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-[#A63D40]" />
                    <span>Order & Fulfillment Health</span>
                  </h4>
                  <div className="space-y-1.5 text-xs text-[#6F625D]">
                    <div className="flex justify-between py-1 border-b border-[#E6D8CC]/60">
                      <span>Pending Orders</span>
                      <span className="font-bold text-[#A63D40]">{adminStats?.pending_orders ?? 0}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E6D8CC]/60">
                      <span>Low Stock Items (&le; 5 units)</span>
                      <span className="font-bold text-[#B84242]">{adminStats?.low_stock_products_count ?? 0}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Monthly Volume</span>
                      <span className="font-bold text-[#3F7D5A]">₹{Number(adminStats?.revenue_month ?? 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#E6D8CC] bg-[#FFF9F3]">
                  <h4 className="font-serif font-bold text-sm text-[#2B2523] mb-2 flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#2980B9]" />
                    <span>Neon Multi-Database Hub Status</span>
                  </h4>
                  <div className="space-y-1.5 text-xs text-[#6F625D]">
                    <div className="flex justify-between py-1 border-b border-[#E6D8CC]/60">
                      <span>Primary DB1 (Main Owner Platform)</span>
                      <span className="font-bold text-[#3F7D5A] inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E6D8CC]/60">
                      <span>Registered Seller DB Partitions</span>
                      <span className="font-bold text-[#2980B9]">{adminDatabases.length || adminSellers.length} active</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Database Management Hub</span>
                      <Link to="/owner/databases" className="text-xs font-semibold text-[#A63D40] hover:underline flex items-center gap-1">
                        <span>Open Hub</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ==========================================================
          CUSTOMER STOREFRONT SECTIONS
          Rendered ONLY when no Owner Dashboard tab is active
          ========================================================== */}
      {(!isOwner || !homeAdminTab) && (
        <>
          {/* ==========================================================
          2. VALUE PROPOSITIONS STRIP
          ========================================================== */}
      <section className="craft-container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-6 bg-white rounded-2xl border border-[#E6D8CC] craft-card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#FFF9F3] text-[#A63D40] border border-[#E6D8CC] shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#A63D40]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[#2B2523]">100% Authentic</h4>
              <p className="text-[11px] text-[#6F625D]">Hereditary Artisans</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#FFF9F3] text-[#C69A5B] border border-[#E6D8CC] shrink-0">
              <Award className="w-5 h-5 text-[#C69A5B]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[#2B2523]">GI Certified</h4>
              <p className="text-[11px] text-[#6F625D]">Regional Craft Clusters</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#FFF9F3] text-[#3F7D5A] border border-[#E6D8CC] shrink-0">
              <Truck className="w-5 h-5 text-[#3F7D5A]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[#2B2523]">Pan-India Shipping</h4>
              <p className="text-[11px] text-[#6F625D]">Secure Fragile Packing</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#FFF9F3] text-[#A63D40] border border-[#E6D8CC] shrink-0">
              <RotateCcw className="w-5 h-5 text-[#A63D40]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[#2B2523]">Fair Trade Value</h4>
              <p className="text-[11px] text-[#6F625D]">Direct Weaver Earnings</p>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================
          3. CATEGORY SPOTLIGHT SECTION (RESPONSIVE 6-8 COLS WIDE)
          ========================================================== */}
      <section className="craft-container">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3 border-b border-[#E6D8CC] pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#A63D40] block mb-1">
              Living Traditions
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#2B2523]">
              Explore by Craft Cluster
            </h2>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#A63D40] hover:text-[#8F3034] transition-colors self-start sm:self-auto"
          >
            <span>View All Crafts</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Responsive CSS Grid that handles dynamic number of categories from backend */}
        {categories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-8 gap-3.5 sm:gap-5">
            {categories.map((cat) => {
              const catName = cat.name || cat.name_en || 'Handicraft';
              const catImage =
                cat.image_url ||
                'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=400&q=80';

              return (
                <Link
                  key={cat.id || cat._id || catName}
                  to={`/products?category=${encodeURIComponent(catName)}`}
                  className="group flex flex-col items-center text-center p-3 sm:p-4 rounded-2xl bg-white border border-[#E6D8CC] craft-card-shadow craft-card-shadow-hover transition-all duration-300"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden mb-3 border-2 border-[#E6D8CC] group-hover:border-[#A63D40] transition-colors p-1 bg-[#FFF9F3]">
                    <img
                      src={catImage}
                      alt={catName}
                      loading="lazy"
                      className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                  </div>
                  <h3 className="font-serif text-xs sm:text-sm font-bold text-[#2B2523] group-hover:text-[#A63D40] transition-colors line-clamp-2">
                    {catName}
                  </h3>
                  <span className="text-[10px] text-[#6F625D] mt-1 font-medium">
                    Artisan Guild
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#E6D8CC]">
            <Compass className="w-10 h-10 text-[#C69A5B] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#2B2523]">No categories available.</p>
            <p className="text-xs text-[#6F625D] mt-1">New craft clusters will be displayed here as they are added.</p>
          </div>
        )}
      </section>

      {/* ==========================================================
          4. FEATURED PRODUCTS (4-5 COLS WIDE ON DESKTOP, 2 ON MOBILE)
          ========================================================== */}
      <section className="craft-container">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3 border-b border-[#E6D8CC] pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#A63D40] block mb-1">
              Curated Masterpieces
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#2B2523]">
              Featured Artisan Creations
            </h2>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#A63D40] hover:text-[#8F3034] transition-colors self-start sm:self-auto"
          >
            <span>View All Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-6">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id || product._id}
                product={product}
                isOwnerView={isOwnerOrSeller}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E6D8CC]">
            <Package className="w-10 h-10 text-[#C69A5B] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#2B2523]">No products available yet.</p>
            <p className="text-xs text-[#6F625D] mt-1">Authentic handicrafts will appear here once published by artisans.</p>
          </div>
        )}
      </section>

      {/* ==========================================================
          5. PROMOTIONAL SPOTLIGHT & SECONDARY BANNERS
          ========================================================== */}
      {(secondaryBanners.length > 0 || settings?.homepage_promo_visible === 'true') && (
        <section className="craft-container">
          {secondaryBanners.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {secondaryBanners.map((sb) => (
                <div
                  key={sb.id}
                  className="relative rounded-3xl overflow-hidden min-h-[220px] sm:min-h-[260px] flex items-center p-6 sm:p-10 border border-[#E6D8CC] shadow-md group"
                  style={{ backgroundColor: sb.bg_color || '#2B2523' }}
                >
                  <img
                    src={sb.image_url}
                    alt={sb.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
                  <div className="relative z-10 space-y-2 text-white max-w-sm">
                    {sb.subtitle && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#B4233B] text-white text-[10px] font-bold uppercase tracking-wider">
                        <Sparkles className="w-3 h-3 text-[#C69A5B]" />
                        {sb.subtitle}
                      </span>
                    )}
                    <h3 className="font-serif text-xl sm:text-2xl font-bold leading-tight">
                      {sb.title}
                    </h3>
                    {sb.description && (
                      <p className="text-xs text-[#F4E8DC] line-clamp-2">
                        {sb.description}
                      </p>
                    )}
                    <div className="pt-2">
                      <Link
                        to={sb.button_link || '/products'}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#B4233B] text-white text-xs font-semibold hover:bg-[#8F3034] transition-colors shadow-sm"
                      >
                        <span>{sb.button_text || 'Shop Now'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="rounded-3xl p-8 sm:p-12 border border-[#E6D8CC] shadow-md flex flex-col md:flex-row items-center justify-between gap-6 transition-all"
              style={{
                backgroundColor: settings?.homepage_promo_bg_color || '#2B2523',
                color: settings?.homepage_promo_text_color || '#FFF9F3',
              }}
            >
              <div className="space-y-3 max-w-xl text-center md:text-left">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#B4233B] text-white text-xs font-bold uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5 text-[#C69A5B]" />
                  CraftNest Special Curation
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight">
                  {settings?.homepage_promo_title || 'Festive Heritage Celebrations'}
                </h2>
                <p className="text-xs sm:text-sm opacity-90 leading-relaxed">
                  {settings?.homepage_promo_subtitle ||
                    'Exclusive Master Artisan Curations & Handwoven Heirlooms sourced directly from GI-registered craft clusters.'}
                </p>
              </div>
              <div className="shrink-0">
                <Link
                  to={settings?.homepage_promo_button_link || '/products'}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#B4233B] hover:bg-[#8F3034] text-white text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                >
                  <span>{settings?.homepage_promo_button_text || 'Explore Heritage'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ==========================================================
          6. HERITAGE STORY SECTION
          ========================================================== */}
      <section className="bg-[#F4E8DC]/50 border-y border-[#E6D8CC] py-12 sm:py-16">
        <div className="craft-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center">
            {/* Visual Mosaic */}
            <div className="relative">
              <div className="aspect-4/3 rounded-3xl overflow-hidden border border-[#E6D8CC] shadow-md">
                <img
                  src="https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?auto=format&fit=crop&w=1200&q=80"
                  alt="Indian Potter on wheel"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 hidden sm:block w-48 h-48 rounded-2xl overflow-hidden border-4 border-white shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80"
                  alt="Banarasi Weaving"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Story Editorial */}
            <div className="space-y-5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#A63D40]">
                The CraftNest Philosophy
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#2B2523] leading-snug">
                Preserving Handcrafted Heritage in an Age of Mass Production
              </h2>
              <p className="text-xs sm:text-sm text-[#6F625D] leading-relaxed">
                In ancient Indian workshops from Jaipur's blue glaze kilns to Varanasi’s pit looms, crafts are more than goods—they are lineages, sacred geometry, and ancestral cultural memory.
              </p>
              <p className="text-xs sm:text-sm text-[#6F625D] leading-relaxed">
                CraftNest eliminates predatory middlemen by connecting you directly with accredited artisan federations. Each piece is authenticated for regional craft purity and fair artisan compensation.
              </p>

              <div className="grid grid-cols-2 gap-3.5 pt-2">
                <div className="p-4 bg-white rounded-xl border border-[#E6D8CC]">
                  <p className="font-serif text-2xl font-bold text-[#A63D40]">100%</p>
                  <p className="text-xs text-[#6F625D] font-medium mt-0.5">Artisan Sourced</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-[#E6D8CC]">
                  <p className="font-serif text-2xl font-bold text-[#C69A5B]">GI Tagged</p>
                  <p className="text-xs text-[#6F625D] font-medium mt-0.5">Authentic Geographic Clusters</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================
          6. NEWSLETTER & ARTISAN COMMUNITY DISPATCH
          ========================================================== */}
      <section className="craft-container">
        <div className="max-w-3xl mx-auto bg-white p-6 sm:p-10 rounded-3xl border border-[#E6D8CC] craft-card-shadow text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center text-[#A63D40] mx-auto">
            <Compass className="w-6 h-6 text-[#A63D40]" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2B2523]">
            Join the Craft Heritage Circle
          </h2>
          <p className="text-xs sm:text-sm text-[#6F625D] max-w-lg mx-auto">
            Receive exclusive stories from generational artisan workshops, private collection releases, and regional craft chronicle dispatches.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert('Thank you for subscribing to CraftNest heritage dispatches!');
            }}
            className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto pt-2"
          >
            <input
              type="email"
              required
              placeholder="Enter your email address"
              className="flex-1 bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl px-4 py-2.5 text-xs text-[#2B2523] placeholder-[#6F625D]/70 focus:bg-white focus:border-[#A63D40]"
            />
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
        </>
      )}
    </div>
  );
};

export default Home;
