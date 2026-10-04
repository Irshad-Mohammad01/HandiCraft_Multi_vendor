import React, { useState, useEffect, useCallback } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Tag,
  Percent,
  Phone,
  Mail,
  MapPin,
  Globe,
  Share2,
  Save,
  RefreshCw,
  X,
  Check,
  Smartphone,
  Monitor,
  ChevronRight,
  Sliders,
  ExternalLink,
  Upload,
  MessageCircle,
  HelpCircle,
  Layers,
  ArrowRight,
} from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import bannersApi from '../../api/banners';
import couponsApi from '../../api/coupons';
import { useSettings } from '../../context/SettingsContext';

const POSITION_LABELS = {
  homepage_hero: 'Homepage Hero Banner',
  homepage_secondary: 'Homepage Secondary Banner',
  category_page: 'Category Page Banner',
  promotional_section: 'Promotional Section Spotlight',
};

const COLOR_PRESETS = [
  { name: 'Heritage Charcoal', bg: '#2B2523', text: '#FFF9F3' },
  { name: 'Royal Terracotta', bg: '#B4233B', text: '#FFFFFF' },
  { name: 'Jaipur Crimson', bg: '#8F3034', text: '#FFF9F3' },
  { name: 'Forest Emerald', bg: '#1B4D3E', text: '#FFFFFF' },
  { name: 'Royal Indigo', bg: '#1A2A44', text: '#FFF9F3' },
  { name: 'Deep Ochre', bg: '#4A3525', text: '#FFF9F3' },
];

export default function OwnerBanners() {
  const { settings, refreshSettings, updateSettings } = useSettings();

  // Active Top Tab
  const [activeTab, setActiveTab] = useState('banners'); // 'banners' | 'homepage' | 'offers' | 'contact'

  // Notification States
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ----------------------------------------------------------------------
  // 1. BANNER STATE
  // ----------------------------------------------------------------------
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [positionFilter, setPositionFilter] = useState('all');
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [previewBannerModal, setPreviewBannerModal] = useState(null);
  const [deleteConfirmBanner, setDeleteConfirmBanner] = useState(null);
  const [bannerSubmitting, setBannerSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingMobileImage, setUploadingMobileImage] = useState(false);

  // Banner Form State
  const initialBannerForm = {
    title: '',
    subtitle: '',
    description: '',
    button_text: 'Explore Collection',
    button_link: '/products',
    image_url: '',
    mobile_image_url: '',
    display_location: 'homepage_hero',
    display_order: 0,
    start_date: '',
    expiry_date: '',
    bg_color: '#2B2523',
    text_color: '#FFFFFF',
    is_active: true,
  };
  const [bannerForm, setBannerForm] = useState(initialBannerForm);

  // ----------------------------------------------------------------------
  // 2. HOMEPAGE CUSTOMIZATION STATE
  // ----------------------------------------------------------------------
  const [homepageSaving, setHomepageSaving] = useState(false);
  const [homepagePreviewMode, setHomepagePreviewMode] = useState('desktop'); // 'desktop' | 'mobile'
  const [homepageConfig, setHomepageConfig] = useState({
    homepage_promo_title: '',
    homepage_promo_subtitle: '',
    homepage_promo_button_text: '',
    homepage_promo_button_link: '',
    homepage_promo_bg_color: '#2B2523',
    homepage_promo_text_color: '#FFF9F3',
    homepage_promo_visible: 'true',
  });

  // ----------------------------------------------------------------------
  // 3. PROMOTIONAL OFFERS / COUPONS STATE
  // ----------------------------------------------------------------------
  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [deleteConfirmCoupon, setDeleteConfirmCoupon] = useState(null);
  const [couponSubmitting, setCouponSubmitting] = useState(false);

  const initialCouponForm = {
    title: '',
    description: '',
    code: '',
    discount_type: 'percent',
    discount_value: 15,
    min_order_amount: 999,
    max_discount: '',
    start_date: '',
    expiry_date: '',
    is_active: true,
  };
  const [couponForm, setCouponForm] = useState(initialCouponForm);

  // ----------------------------------------------------------------------
  // 4. CONTACT INFORMATION STATE
  // ----------------------------------------------------------------------
  const [contactSaving, setContactSaving] = useState(false);
  const [contactForm, setContactForm] = useState({
    platform_name: '',
    support_phone: '',
    support_email: '',
    whatsapp_number: '',
    business_address: '',
    contact_page_info: '',
    working_hours: '',
    social_instagram: '',
    social_facebook: '',
    social_youtube: '',
    social_twitter: '',
  });

  // Sync settings when loaded
  useEffect(() => {
    if (settings) {
      setHomepageConfig({
        homepage_promo_title: settings.homepage_promo_title || 'Festive Heritage Celebrations',
        homepage_promo_subtitle: settings.homepage_promo_subtitle || 'Exclusive Master Artisan Curations & Handwoven Heirlooms',
        homepage_promo_button_text: settings.homepage_promo_button_text || 'Explore Heritage',
        homepage_promo_button_link: settings.homepage_promo_button_link || '/products',
        homepage_promo_bg_color: settings.homepage_promo_bg_color || '#2B2523',
        homepage_promo_text_color: settings.homepage_promo_text_color || '#FFF9F3',
        homepage_promo_visible: settings.homepage_promo_visible !== 'false' ? 'true' : 'false',
      });

      setContactForm({
        platform_name: settings.platform_name || 'CraftNest Indian Handicrafts',
        support_phone: settings.support_phone || '+91 141 256 7890',
        support_email: settings.support_email || 'care@craftnest.in',
        whatsapp_number: settings.whatsapp_number || '+91 98765 43210',
        business_address: settings.business_address || 'CraftNest Artisan Hub, Bapu Bazaar, Jaipur, Rajasthan 302001',
        contact_page_info: settings.contact_page_info || 'Whether you have questions about custom handicraft orders, artisan guild partnerships, or delivery status, our craft care team is here to assist.',
        working_hours: settings.working_hours || 'Mon - Sat: 10:00 AM - 7:00 PM IST',
        social_instagram: settings.social_instagram || 'https://instagram.com/craftnest.in',
        social_facebook: settings.social_facebook || 'https://facebook.com/craftnest.in',
        social_youtube: settings.social_youtube || 'https://youtube.com/@craftnest',
        social_twitter: settings.social_twitter || 'https://x.com/craftnest_in',
      });
    }
  }, [settings]);

  // Load Banners
  const loadBanners = useCallback(async () => {
    setBannersLoading(true);
    try {
      const data = await bannersApi.getAllBanners();
      setBanners(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load banners:', err);
      setErrorMsg('Failed to fetch promotional banners.');
    } finally {
      setBannersLoading(false);
    }
  }, []);

  // Load Coupons
  const loadCoupons = useCallback(async () => {
    setCouponsLoading(true);
    try {
      const data = await couponsApi.getCoupons();
      setCoupons(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load coupons:', err);
      setErrorMsg('Failed to fetch promotional offers.');
    } finally {
      setCouponsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBanners();
    loadCoupons();
  }, [loadBanners, loadCoupons]);

  const showToast = (msg, isErr = false) => {
    if (isErr) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  // ----------------------------------------------------------------------
  // BANNER HANDLERS
  // ----------------------------------------------------------------------
  const handleOpenAddBanner = () => {
    setEditingBanner(null);
    setBannerForm({
      ...initialBannerForm,
      display_order: banners.length,
    });
    setBannerModalOpen(true);
  };

  const handleOpenEditBanner = (b) => {
    setEditingBanner(b);
    setBannerForm({
      title: b.title || '',
      subtitle: b.subtitle || '',
      description: b.description || '',
      button_text: b.button_text || 'Explore Collection',
      button_link: b.button_link || '/products',
      image_url: b.image_url || '',
      mobile_image_url: b.mobile_image_url || '',
      display_location: b.display_location || 'homepage_hero',
      display_order: b.display_order ?? 0,
      start_date: b.start_date ? b.start_date.slice(0, 16) : '',
      expiry_date: b.expiry_date ? b.expiry_date.slice(0, 16) : '',
      bg_color: b.bg_color || '#2B2523',
      text_color: b.text_color || '#FFFFFF',
      is_active: b.is_active ?? true,
    });
    setBannerModalOpen(true);
  };

  const handleImageFileUpload = async (e, isMobile = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isMobile) setUploadingMobileImage(true);
    else setUploadingImage(true);

    try {
      const res = await bannersApi.uploadBannerImage(file);
      const url = res.url || res.image_url;
      if (url) {
        if (isMobile) {
          setBannerForm((prev) => ({ ...prev, mobile_image_url: url }));
        } else {
          setBannerForm((prev) => ({
            ...prev,
            image_url: url,
            mobile_image_url: prev.mobile_image_url || url,
          }));
        }
        showToast(`${isMobile ? 'Mobile' : 'Desktop'} banner image uploaded successfully!`);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to upload image.', true);
    } finally {
      if (isMobile) setUploadingMobileImage(false);
      else setUploadingImage(false);
    }
  };

  const handleSaveBanner = async (e) => {
    e.preventDefault();
    if (!bannerForm.title.trim()) {
      showToast('Please provide a banner title.', true);
      return;
    }
    if (!bannerForm.image_url.trim()) {
      showToast('Please provide or upload a banner image.', true);
      return;
    }

    setBannerSubmitting(true);
    try {
      const payload = {
        ...bannerForm,
        display_order: parseInt(bannerForm.display_order || 0, 10),
      };

      if (editingBanner) {
        await bannersApi.updateBanner(editingBanner.id, payload);
        showToast('Banner updated successfully!');
      } else {
        await bannersApi.createBanner(payload);
        showToast('New banner published successfully!');
      }
      setBannerModalOpen(false);
      await loadBanners();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save banner.', true);
    } finally {
      setBannerSubmitting(false);
    }
  };

  const handleToggleBanner = async (b) => {
    try {
      await bannersApi.toggleBanner(b.id);
      showToast(`Banner ${b.is_active ? 'deactivated' : 'activated'}!`);
      await loadBanners();
    } catch (err) {
      showToast('Failed to toggle banner status.', true);
    }
  };

  const handleDeleteBanner = async () => {
    if (!deleteConfirmBanner) return;
    try {
      await bannersApi.deleteBanner(deleteConfirmBanner.id);
      showToast('Banner removed successfully.');
      setDeleteConfirmBanner(null);
      await loadBanners();
    } catch (err) {
      showToast('Failed to delete banner.', true);
    }
  };

  const handleReorder = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const newBanners = [...banners];
    const [moved] = newBanners.splice(index, 1);
    newBanners.splice(targetIndex, 0, moved);

    // Update display orders
    const orders = newBanners.map((b, i) => ({ id: b.id, display_order: i }));
    setBanners(newBanners);

    try {
      await bannersApi.reorderBanners(orders);
      showToast('Banner order saved!');
    } catch (err) {
      showToast('Failed to save banner reordering.', true);
      await loadBanners();
    }
  };

  // Filtered Banners
  const filteredBanners = banners.filter((b) => {
    if (positionFilter === 'all') return true;
    return (b.display_location || 'homepage_hero') === positionFilter;
  });

  // Banner metrics
  const totalBannersCount = banners.length;
  const activeBannersCount = banners.filter((b) => b.status === 'Active' || (b.is_active && !b.status)).length;
  const scheduledBannersCount = banners.filter((b) => b.status === 'Scheduled').length;
  const expiredBannersCount = banners.filter((b) => b.status === 'Expired').length;

  // ----------------------------------------------------------------------
  // HOMEPAGE CUSTOMIZATION HANDLERS
  // ----------------------------------------------------------------------
  const handleSaveHomepageConfig = async (e) => {
    e.preventDefault();
    setHomepageSaving(true);
    try {
      await updateSettings(homepageConfig);
      await refreshSettings();
      showToast('Homepage promotional settings saved & live on storefront!');
    } catch (err) {
      showToast('Failed to update homepage settings.', true);
    } finally {
      setHomepageSaving(false);
    }
  };

  // ----------------------------------------------------------------------
  // PROMOTIONAL OFFERS HANDLERS
  // ----------------------------------------------------------------------
  const handleOpenAddCoupon = () => {
    setEditingCoupon(null);
    setCouponForm(initialCouponForm);
    setCouponModalOpen(true);
  };

  const handleOpenEditCoupon = (c) => {
    setEditingCoupon(c);
    setCouponForm({
      title: c.title || c.code || '',
      description: c.description || '',
      code: c.code || '',
      discount_type: c.discount_type || 'percent',
      discount_value: c.discount_value ?? 15,
      min_order_amount: c.min_order_amount ?? 0,
      max_discount: c.max_discount ?? '',
      start_date: c.start_date ? c.start_date.slice(0, 16) : '',
      expiry_date: c.expiry_date ? c.expiry_date.slice(0, 16) : '',
      is_active: c.is_active ?? true,
    });
    setCouponModalOpen(true);
  };

  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    if (!couponForm.code.trim()) {
      showToast('Please enter a promotional promo code.', true);
      return;
    }
    setCouponSubmitting(true);
    try {
      const payload = {
        ...couponForm,
        code: couponForm.code.trim().toUpperCase(),
        discount_value: parseFloat(couponForm.discount_value),
        min_order_amount: parseFloat(couponForm.min_order_amount || 0),
        max_discount: couponForm.max_discount !== '' ? parseFloat(couponForm.max_discount) : null,
      };

      if (editingCoupon) {
        await couponsApi.updateCoupon(editingCoupon.id, payload);
        showToast('Promotional offer updated successfully!');
      } else {
        await couponsApi.createCoupon(payload);
        showToast('New promotional offer created successfully!');
      }
      setCouponModalOpen(false);
      await loadCoupons();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save offer.', true);
    } finally {
      setCouponSubmitting(false);
    }
  };

  const handleToggleCoupon = async (c) => {
    try {
      await couponsApi.toggleCoupon(c.id);
      showToast(`Offer ${c.is_active ? 'deactivated' : 'activated'}!`);
      await loadCoupons();
    } catch (err) {
      showToast('Failed to toggle offer status.', true);
    }
  };

  const handleDeleteCoupon = async () => {
    if (!deleteConfirmCoupon) return;
    try {
      await couponsApi.deleteCoupon(deleteConfirmCoupon.id);
      showToast('Promotional offer deleted.');
      setDeleteConfirmCoupon(null);
      await loadCoupons();
    } catch (err) {
      showToast('Failed to delete offer.', true);
    }
  };

  // ----------------------------------------------------------------------
  // CONTACT INFORMATION HANDLERS
  // ----------------------------------------------------------------------
  const handleSaveContact = async (e) => {
    e.preventDefault();
    setContactSaving(true);
    try {
      await updateSettings(contactForm);
      await refreshSettings();
      showToast('Business contact details updated & active across website!');
    } catch (err) {
      showToast('Failed to update contact details.', true);
    } finally {
      setContactSaving(false);
    }
  };

  return (
    <DashboardLayout
      title="Promotions & Banners"
      subtitle="Complete management hub for storefront banners, hero carousels, promotional coupons, and verified business contacts"
    >
      <div className="space-y-6">
        {/* Toast Alerts */}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-[#1B4D3E] flex items-center gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-[#B4233B] flex items-center gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Primary Navigation Tabs */}
        <div className="bg-white rounded-2xl border border-[#E6D8CC] p-1.5 flex flex-wrap gap-1 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('banners')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'banners'
                ? 'bg-[#B4233B] text-white shadow-xs'
                : 'text-[#6F625D] hover:text-[#2B2523] hover:bg-[#FFF9F3]'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Banner Management</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'banners'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#FFF9F3] text-[#A63D40] border border-[#E6D8CC]'
              }`}
            >
              {banners.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('homepage')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'homepage'
                ? 'bg-[#B4233B] text-white shadow-xs'
                : 'text-[#6F625D] hover:text-[#2B2523] hover:bg-[#FFF9F3]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Homepage Customizer & Preview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('offers')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'offers'
                ? 'bg-[#B4233B] text-white shadow-xs'
                : 'text-[#6F625D] hover:text-[#2B2523] hover:bg-[#FFF9F3]'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Promotional Offers & Coupons</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'offers'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#FFF9F3] text-[#A63D40] border border-[#E6D8CC]'
              }`}
            >
              {coupons.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'contact'
                ? 'bg-[#B4233B] text-white shadow-xs'
                : 'text-[#6F625D] hover:text-[#2B2523] hover:bg-[#FFF9F3]'
            }`}
          >
            <Phone className="w-4 h-4" />
            <span>Business Contacts & Social Links</span>
          </button>
        </div>

        {/* ==================================================================
            TAB 1: BANNER MANAGEMENT
            ================================================================== */}
        {activeTab === 'banners' && (
          <div className="space-y-6">
            {/* Top Metric Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-white border border-[#E6D8CC] shadow-xs">
                <p className="text-[11px] font-medium text-[#6F625D]">Total Banners</p>
                <p className="text-2xl font-serif font-bold text-[#2B2523] mt-0.5">
                  {totalBannersCount}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-xs">
                <p className="text-[11px] font-medium text-emerald-700">Currently Active</p>
                <p className="text-2xl font-serif font-bold text-emerald-800 mt-0.5">
                  {activeBannersCount}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-amber-100 shadow-xs">
                <p className="text-[11px] font-medium text-amber-700">Scheduled Ahead</p>
                <p className="text-2xl font-serif font-bold text-amber-800 mt-0.5">
                  {scheduledBannersCount}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-rose-100 shadow-xs">
                <p className="text-[11px] font-medium text-rose-700">Expired / Inactive</p>
                <p className="text-2xl font-serif font-bold text-rose-800 mt-0.5">
                  {expiredBannersCount + (totalBannersCount - activeBannersCount - scheduledBannersCount - expiredBannersCount)}
                </p>
              </div>
            </div>

            {/* Action Bar & Location Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E6D8CC] shadow-xs">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs font-semibold text-[#6F625D] shrink-0 mr-1">Position:</span>
                {[
                  { id: 'all', label: 'All Locations' },
                  { id: 'homepage_hero', label: 'Homepage Hero' },
                  { id: 'homepage_secondary', label: 'Secondary Banner' },
                  { id: 'category_page', label: 'Category Page' },
                  { id: 'promotional_section', label: 'Promo Section' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setPositionFilter(pos.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                      positionFilter === pos.id
                        ? 'bg-[#2B2523] text-white'
                        : 'bg-[#FFF9F3] text-[#6F625D] hover:text-[#2B2523] border border-[#E6D8CC]'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={loadBanners}
                  disabled={bannersLoading}
                  className="p-2.5 rounded-xl border border-[#E6D8CC] text-[#6F625D] hover:text-[#2B2523] hover:bg-[#FFF9F3] transition-colors cursor-pointer"
                  title="Refresh list"
                >
                  <RefreshCw className={`w-4 h-4 ${bannersLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddBanner}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B4233B] hover:bg-[#8F3034] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Promotional Banner</span>
                </button>
              </div>
            </div>

            {/* Banners List */}
            {bannersLoading ? (
              <div className="py-20 flex justify-center bg-white rounded-3xl border border-[#E6D8CC]">
                <LoadingSpinner label="Loading banners from database..." />
              </div>
            ) : filteredBanners.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-[#E6D8CC] p-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center text-[#B4233B] mx-auto">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-base font-bold text-[#2B2523]">
                  No Banners Found in this Location
                </h3>
                <p className="text-xs text-[#6F625D] max-w-sm mx-auto">
                  Click the button below to upload and schedule your first promotional banner for this section.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddBanner}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B4233B] text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Banner</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredBanners.map((banner, index) => {
                  const status = banner.status || (banner.is_active ? 'Active' : 'Inactive');
                  let statusBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                  if (status === 'Inactive') statusBadgeClass = 'bg-slate-100 text-slate-700 border-slate-300';
                  if (status === 'Scheduled') statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
                  if (status === 'Expired') statusBadgeClass = 'bg-rose-50 text-rose-800 border-rose-200';

                  return (
                    <div
                      key={banner.id}
                      className="bg-white rounded-2xl border border-[#E6D8CC] p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5"
                    >
                      {/* Left: Thumbnail & Content */}
                      <div className="flex flex-col sm:flex-row items-start gap-4 flex-1 min-w-0">
                        {/* Image Preview Box */}
                        <div className="relative w-full sm:w-44 h-28 rounded-xl overflow-hidden bg-[#2B2523] border border-[#E6D8CC] shrink-0 group">
                          <img
                            src={banner.image_url}
                            alt={banner.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.src =
                                'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80';
                            }}
                          />
                          <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                            <span className="px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold">
                              #{banner.display_order ?? index}
                            </span>
                            {banner.mobile_image_url && (
                              <span className="px-1.5 py-0.5 rounded-md bg-[#B4233B]/90 text-white text-[9px] font-bold flex items-center gap-0.5">
                                <Smartphone className="w-2.5 h-2.5" />
                                <span>Mobile</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Text Details */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusBadgeClass}`}
                            >
                              {status}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-[#FFF9F3] text-[#A63D40] text-[10px] font-semibold border border-[#E6D8CC]">
                              {POSITION_LABELS[banner.display_location] || 'Homepage Hero'}
                            </span>
                          </div>

                          <h4 className="font-serif text-base font-bold text-[#2B2523] truncate">
                            {banner.title}
                          </h4>

                          {banner.subtitle && (
                            <p className="text-xs font-semibold text-[#A63D40] line-clamp-1">
                              {banner.subtitle}
                            </p>
                          )}

                          {banner.description && (
                            <p className="text-xs text-[#6F625D] line-clamp-2">
                              {banner.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#6F625D] pt-1">
                            <span className="inline-flex items-center gap-1">
                              <ExternalLink className="w-3 h-3 text-[#A63D40]" />
                              <span>CTA: <strong>{banner.button_text || 'None'}</strong> → {banner.button_link || '#'}</span>
                            </span>
                            {(banner.start_date || banner.expiry_date) && (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-[#C69A5B]" />
                                <span>
                                  {banner.start_date ? new Date(banner.start_date).toLocaleDateString() : 'Now'} —{' '}
                                  {banner.expiry_date ? new Date(banner.expiry_date).toLocaleDateString() : 'Forever'}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Controls & Actions */}
                      <div className="flex flex-wrap items-center gap-2 self-end lg:self-center shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#E6D8CC] w-full lg:w-auto justify-between lg:justify-end">
                        {/* Order Controls */}
                        <div className="flex items-center gap-1 bg-[#FFF9F3] p-1 rounded-xl border border-[#E6D8CC]">
                          <button
                            type="button"
                            onClick={() => handleReorder(index, 'up')}
                            disabled={index === 0}
                            className="p-1.5 rounded-lg text-[#6F625D] hover:text-[#2B2523] hover:bg-white disabled:opacity-30 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReorder(index, 'down')}
                            disabled={index === banners.length - 1}
                            className="p-1.5 rounded-lg text-[#6F625D] hover:text-[#2B2523] hover:bg-white disabled:opacity-30 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Toggle Active */}
                        <button
                          type="button"
                          onClick={() => handleToggleBanner(banner)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                            banner.is_active
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {banner.is_active ? 'Active' : 'Inactive'}
                        </button>

                        {/* Preview */}
                        <button
                          type="button"
                          onClick={() => setPreviewBannerModal(banner)}
                          className="p-2 rounded-xl text-[#6F625D] hover:text-[#2B2523] hover:bg-[#FFF9F3] border border-[#E6D8CC] transition-colors cursor-pointer"
                          title="Preview banner"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditBanner(banner)}
                          className="p-2 rounded-xl text-[#B4233B] hover:bg-[#FFF9F3] border border-[#E6D8CC] transition-colors cursor-pointer"
                          title="Edit banner"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmBanner(banner)}
                          className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                          title="Delete banner"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================================================================
            TAB 2: HOMEPAGE CUSTOMIZATION & LIVE PREVIEW
            ================================================================== */}
        {activeTab === 'homepage' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Customization Controls (5 cols) */}
            <form
              onSubmit={handleSaveHomepageConfig}
              className="lg:col-span-5 bg-white rounded-3xl border border-[#E6D8CC] p-6 shadow-xs space-y-5"
            >
              <div className="border-b border-[#E6D8CC] pb-3">
                <h3 className="font-serif text-base font-bold text-[#2B2523]">
                  Homepage Content Settings
                </h3>
                <p className="text-xs text-[#6F625D]">
                  Custom promotional copy, background styles, and visibility for customer storefront.
                </p>
              </div>

              {/* Promotional Section Visibility */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC]">
                <div>
                  <label className="text-xs font-bold text-[#2B2523] block">
                    Secondary Promotional Section
                  </label>
                  <p className="text-[11px] text-[#6F625D]">
                    Display prominent promotional spotlight band on homepage
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setHomepageConfig((prev) => ({
                      ...prev,
                      homepage_promo_visible:
                        prev.homepage_promo_visible === 'true' ? 'false' : 'true',
                    }))
                  }
                  className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                    homepageConfig.homepage_promo_visible === 'true'
                      ? 'bg-[#B4233B]'
                      : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      homepageConfig.homepage_promo_visible === 'true' ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Promo Title */}
              <div>
                <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                  Promotional Spotlight Title
                </label>
                <input
                  type="text"
                  value={homepageConfig.homepage_promo_title}
                  onChange={(e) =>
                    setHomepageConfig({ ...homepageConfig, homepage_promo_title: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] focus:border-[#B4233B] outline-none"
                  placeholder="e.g. Master Artisan Heritage Spotlight"
                />
              </div>

              {/* Promo Subtitle */}
              <div>
                <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                  Promotional Spotlight Subtitle / Tagline
                </label>
                <textarea
                  rows={2}
                  value={homepageConfig.homepage_promo_subtitle}
                  onChange={(e) =>
                    setHomepageConfig({
                      ...homepageConfig,
                      homepage_promo_subtitle: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] focus:border-[#B4233B] outline-none"
                  placeholder="e.g. Authentic Handloom, Terracotta, and Heirloom Brassware curated directly from hereditary masters."
                />
              </div>

              {/* CTA Button Text & Link */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                    Button Label
                  </label>
                  <input
                    type="text"
                    value={homepageConfig.homepage_promo_button_text}
                    onChange={(e) =>
                      setHomepageConfig({
                        ...homepageConfig,
                        homepage_promo_button_text: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] focus:border-[#B4233B] outline-none"
                    placeholder="Explore Collection"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                    Button Redirect URL
                  </label>
                  <input
                    type="text"
                    value={homepageConfig.homepage_promo_button_link}
                    onChange={(e) =>
                      setHomepageConfig({
                        ...homepageConfig,
                        homepage_promo_button_link: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] focus:border-[#B4233B] outline-none"
                    placeholder="/products"
                  />
                </div>
              </div>

              {/* Colors Customization */}
              <div className="space-y-3 pt-1">
                <label className="block text-xs font-semibold text-[#2B2523]">
                  Background & Text Color Scheme
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() =>
                        setHomepageConfig((prev) => ({
                          ...prev,
                          homepage_promo_bg_color: p.bg,
                          homepage_promo_text_color: p.text,
                        }))
                      }
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E6D8CC] text-[11px] font-medium transition-all cursor-pointer hover:border-[#B4233B]"
                      style={{
                        backgroundColor: p.bg,
                        color: p.text,
                      }}
                    >
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] text-[#6F625D] mb-1">
                      Custom Background Hex
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={homepageConfig.homepage_promo_bg_color}
                        onChange={(e) =>
                          setHomepageConfig({
                            ...homepageConfig,
                            homepage_promo_bg_color: e.target.value,
                          })
                        }
                        className="w-8 h-8 rounded-lg border border-[#E6D8CC] p-0.5 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={homepageConfig.homepage_promo_bg_color}
                        onChange={(e) =>
                          setHomepageConfig({
                            ...homepageConfig,
                            homepage_promo_bg_color: e.target.value,
                          })
                        }
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#E6D8CC] text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#6F625D] mb-1">
                      Custom Text Hex
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={homepageConfig.homepage_promo_text_color}
                        onChange={(e) =>
                          setHomepageConfig({
                            ...homepageConfig,
                            homepage_promo_text_color: e.target.value,
                          })
                        }
                        className="w-8 h-8 rounded-lg border border-[#E6D8CC] p-0.5 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={homepageConfig.homepage_promo_text_color}
                        onChange={(e) =>
                          setHomepageConfig({
                            ...homepageConfig,
                            homepage_promo_text_color: e.target.value,
                          })
                        }
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#E6D8CC] text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={homepageSaving}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#B4233B] hover:bg-[#8F3034] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                {homepageSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save & Publish Changes to Website</span>
              </button>
            </form>

            {/* Right Column: Interactive Live Preview (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E6D8CC] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E6D8CC] pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#B4233B]" />
                  <h3 className="font-serif text-base font-bold text-[#2B2523]">
                    Live Storefront Preview
                  </h3>
                </div>
                {/* View Switcher */}
                <div className="flex items-center gap-1 bg-[#FFF9F3] p-1 rounded-xl border border-[#E6D8CC]">
                  <button
                    type="button"
                    onClick={() => setHomepagePreviewMode('desktop')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                      homepagePreviewMode === 'desktop'
                        ? 'bg-[#2B2523] text-white'
                        : 'text-[#6F625D]'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Desktop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHomepagePreviewMode('mobile')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                      homepagePreviewMode === 'mobile'
                        ? 'bg-[#2B2523] text-white'
                        : 'text-[#6F625D]'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Preview Container */}
              <div className="bg-[#FFF9F3] p-4 sm:p-6 rounded-2xl border border-[#E6D8CC] flex justify-center">
                {homepagePreviewMode === 'desktop' ? (
                  /* DESKTOP MOCKUP */
                  <div className="w-full max-w-xl rounded-2xl overflow-hidden shadow-lg border border-[#E6D8CC] bg-white">
                    {/* Simulated Browser Bar */}
                    <div className="bg-[#2B2523] px-3 py-1.5 flex items-center gap-1.5 text-white/50 text-[10px]">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                      <span className="ml-2 font-mono text-[9px] text-white/70">
                        craftnest.in
                      </span>
                    </div>

                    {/* Promotional Banner Mockup */}
                    {homepageConfig.homepage_promo_visible === 'true' ? (
                      <div
                        className="p-8 transition-colors duration-300"
                        style={{
                          backgroundColor: homepageConfig.homepage_promo_bg_color,
                          color: homepageConfig.homepage_promo_text_color,
                        }}
                      >
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#B4233B] text-white text-[10px] font-bold uppercase tracking-wider mb-2">
                          <Sparkles className="w-3 h-3 text-[#C69A5B]" />
                          CraftNest Featured
                        </span>
                        <h2 className="font-serif text-2xl font-bold leading-tight mb-2">
                          {homepageConfig.homepage_promo_title || 'Promotional Title Here'}
                        </h2>
                        <p className="text-xs opacity-90 leading-relaxed mb-4 max-w-md">
                          {homepageConfig.homepage_promo_subtitle ||
                            'Promotional description and artisan heritage details will appear right here.'}
                        </p>
                        <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#B4233B] text-white text-xs font-semibold shadow-sm">
                          <span>{homepageConfig.homepage_promo_button_text || 'Explore Collection'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs text-[#6F625D] bg-white">
                        <AlertCircle className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                        <span>Secondary Promotional Section is currently hidden on storefront.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* MOBILE MOCKUP */
                  <div className="w-72 rounded-3xl overflow-hidden shadow-xl border-4 border-[#2B2523] bg-white">
                    {/* Simulated Phone Notch */}
                    <div className="bg-[#2B2523] h-4 flex justify-center items-center">
                      <div className="w-16 h-2 rounded-full bg-black/50" />
                    </div>

                    {/* Mobile Banner Content */}
                    {homepageConfig.homepage_promo_visible === 'true' ? (
                      <div
                        className="p-5 transition-colors duration-300 space-y-2.5"
                        style={{
                          backgroundColor: homepageConfig.homepage_promo_bg_color,
                          color: homepageConfig.homepage_promo_text_color,
                        }}
                      >
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#B4233B] text-white text-[9px] font-bold uppercase">
                          <Sparkles className="w-2.5 h-2.5 text-[#C69A5B]" />
                          Featured
                        </span>
                        <h3 className="font-serif text-lg font-bold leading-snug">
                          {homepageConfig.homepage_promo_title || 'Promotional Title'}
                        </h3>
                        <p className="text-[11px] opacity-90 leading-relaxed line-clamp-3">
                          {homepageConfig.homepage_promo_subtitle}
                        </p>
                        <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#B4233B] text-white text-[11px] font-semibold">
                          <span>{homepageConfig.homepage_promo_button_text}</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-xs text-[#6F625D]">
                        Promotional Section is disabled.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
            TAB 3: PROMOTIONAL OFFERS & COUPONS
            ================================================================== */}
        {activeTab === 'offers' && (
          <div className="space-y-6">
            {/* Top Metric Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-white border border-[#E6D8CC] shadow-xs">
                <p className="text-[11px] font-medium text-[#6F625D]">Total Promo Offers</p>
                <p className="text-2xl font-serif font-bold text-[#2B2523] mt-0.5">
                  {coupons.length}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-xs">
                <p className="text-[11px] font-medium text-emerald-700">Active Coupons</p>
                <p className="text-2xl font-serif font-bold text-emerald-800 mt-0.5">
                  {coupons.filter((c) => c.status === 'Active' || (c.is_active && !c.status)).length}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-amber-100 shadow-xs">
                <p className="text-[11px] font-medium text-amber-700">Scheduled / Expired</p>
                <p className="text-2xl font-serif font-bold text-amber-800 mt-0.5">
                  {coupons.filter((c) => c.status === 'Scheduled' || c.status === 'Expired').length}
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-[#E6D8CC] shadow-xs">
              <div className="text-xs text-[#6F625D]">
                Manage checkout discount vouchers, festive promo codes, and minimum basket rules.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadCoupons}
                  disabled={couponsLoading}
                  className="p-2.5 rounded-xl border border-[#E6D8CC] text-[#6F625D] hover:text-[#2B2523] hover:bg-[#FFF9F3] transition-colors cursor-pointer"
                  title="Refresh offers"
                >
                  <RefreshCw className={`w-4 h-4 ${couponsLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddCoupon}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B4233B] hover:bg-[#8F3034] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Promotional Offer</span>
                </button>
              </div>
            </div>

            {/* Offers Table */}
            {couponsLoading ? (
              <div className="py-20 flex justify-center bg-white rounded-3xl border border-[#E6D8CC]">
                <LoadingSpinner label="Loading promotional offers..." />
              </div>
            ) : coupons.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-[#E6D8CC] p-8 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center text-[#B4233B] mx-auto">
                  <Tag className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-base font-bold text-[#2B2523]">
                  No Promotional Offers Created
                </h3>
                <p className="text-xs text-[#6F625D] max-w-sm mx-auto">
                  Provide your customers with promo codes and discounts to celebrate festival seasons and artisan heritage.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddCoupon}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B4233B] text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Offer</span>
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E6D8CC] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FFF9F3] border-b border-[#E6D8CC] text-[#2B2523]">
                      <tr>
                        <th className="py-3 px-4 font-bold">Promo Code</th>
                        <th className="py-3 px-4 font-bold">Offer Title</th>
                        <th className="py-3 px-4 font-bold">Discount Value</th>
                        <th className="py-3 px-4 font-bold">Min Order / Cap</th>
                        <th className="py-3 px-4 font-bold">Validity Period</th>
                        <th className="py-3 px-4 font-bold">Status</th>
                        <th className="py-3 px-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6D8CC]/60">
                      {coupons.map((coupon) => {
                        const status = coupon.status || (coupon.is_active ? 'Active' : 'Inactive');
                        let statusClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                        if (status === 'Inactive') statusClass = 'bg-slate-100 text-slate-700 border-slate-300';
                        if (status === 'Scheduled') statusClass = 'bg-amber-50 text-amber-800 border-amber-200';
                        if (status === 'Expired') statusClass = 'bg-rose-50 text-rose-800 border-rose-200';

                        return (
                          <tr key={coupon.id || coupon._id} className="hover:bg-[#FFF9F3]/40 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-[#B4233B]">
                              <span className="px-2.5 py-1 rounded-md bg-[#FFF9F3] border border-[#E6D8CC]">
                                {coupon.code}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-semibold text-[#2B2523]">{coupon.title || coupon.code}</p>
                              {coupon.description && (
                                <p className="text-[11px] text-[#6F625D] line-clamp-1">
                                  {coupon.description}
                                </p>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-[#2B2523]">
                              {coupon.discount_type === 'percent'
                                ? `${coupon.discount_value}% OFF`
                                : `₹${coupon.discount_value} FLAT`}
                            </td>
                            <td className="py-3.5 px-4 text-[11px] text-[#6F625D]">
                              <div>Min: ₹{coupon.min_order_amount || 0}</div>
                              {coupon.max_discount && <div>Max Cap: ₹{coupon.max_discount}</div>}
                            </td>
                            <td className="py-3.5 px-4 text-[11px] text-[#6F625D]">
                              {coupon.start_date || coupon.expiry_date ? (
                                <span>
                                  {coupon.start_date ? new Date(coupon.start_date).toLocaleDateString() : 'Now'} —{' '}
                                  {coupon.expiry_date ? new Date(coupon.expiry_date).toLocaleDateString() : 'Forever'}
                                </span>
                              ) : (
                                <span>Always Valid</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusClass}`}
                              >
                                {status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleCoupon(coupon)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                                    coupon.is_active
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : 'bg-slate-50 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {coupon.is_active ? 'Active' : 'Inactive'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditCoupon(coupon)}
                                  className="p-1.5 rounded-lg text-[#B4233B] hover:bg-[#FFF9F3] border border-[#E6D8CC] cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmCoupon(coupon)}
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================
            TAB 4: BUSINESS CONTACT DETAILS & SOCIAL MEDIA
            ================================================================== */}
        {activeTab === 'contact' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <form
              onSubmit={handleSaveContact}
              className="lg:col-span-7 bg-white rounded-3xl border border-[#E6D8CC] p-6 sm:p-8 shadow-xs space-y-6"
            >
              <div className="border-b border-[#E6D8CC] pb-3">
                <h3 className="font-serif text-lg font-bold text-[#2B2523] flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#B4233B]" />
                  <span>Platform Contact & Customer Support Configuration</span>
                </h3>
                <p className="text-xs text-[#6F625D] mt-0.5">
                  These verified contact details automatically reflect on the customer-facing website footer, contact pages, and order receipts.
                </p>
              </div>

              {/* Platform Identity */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#A63D40]">
                  Core Business Identity
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                    Business / Platform Brand Name
                  </label>
                  <input
                    type="text"
                    required
                    value={contactForm.platform_name}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, platform_name: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] focus:border-[#B4233B] outline-none"
                    placeholder="CraftNest Indian Handicrafts"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                      Customer Support Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-3 text-[#6F625D]" />
                      <input
                        type="text"
                        required
                        value={contactForm.support_phone}
                        onChange={(e) =>
                          setContactForm({ ...contactForm, support_phone: e.target.value })
                        }
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] focus:border-[#B4233B] outline-none"
                        placeholder="+91 141 256 7890"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                      WhatsApp Contact Number
                    </label>
                    <div className="relative">
                      <MessageCircle className="w-4 h-4 absolute left-3 top-3 text-emerald-600" />
                      <input
                        type="text"
                        value={contactForm.whatsapp_number}
                        onChange={(e) =>
                          setContactForm({ ...contactForm, whatsapp_number: e.target.value })
                        }
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] focus:border-[#B4233B] outline-none"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                      Customer Support Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-3 text-[#6F625D]" />
                      <input
                        type="email"
                        required
                        value={contactForm.support_email}
                        onChange={(e) =>
                          setContactForm({ ...contactForm, support_email: e.target.value })
                        }
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] focus:border-[#B4233B] outline-none"
                        placeholder="care@craftnest.in"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                      Customer Support Working Hours
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 absolute left-3 top-3 text-[#6F625D]" />
                      <input
                        type="text"
                        value={contactForm.working_hours}
                        onChange={(e) =>
                          setContactForm({ ...contactForm, working_hours: e.target.value })
                        }
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] focus:border-[#B4233B] outline-none"
                        placeholder="Mon - Sat: 10:00 AM - 7:00 PM IST"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                    Physical Business / Artisan Hub Address
                  </label>
                  <textarea
                    rows={2}
                    value={contactForm.business_address}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, business_address: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] focus:border-[#B4233B] outline-none"
                    placeholder="CraftNest Artisan Hub, Bapu Bazaar, Jaipur, Rajasthan 302001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                    Contact Page Introduction / Artisan Care Info
                  </label>
                  <textarea
                    rows={3}
                    value={contactForm.contact_page_info}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, contact_page_info: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] focus:border-[#B4233B] outline-none"
                    placeholder="Brief description explaining how customer care assists with custom orders and artisan inquiries."
                  />
                </div>
              </div>

              {/* Social Media Links */}
              <div className="space-y-4 pt-2 border-t border-[#E6D8CC]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#A63D40]">
                  Official Social Channels
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                      Instagram Profile URL
                    </label>
                    <input
                      type="url"
                      value={contactForm.social_instagram}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, social_instagram: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] focus:border-[#B4233B] outline-none"
                      placeholder="https://instagram.com/craftnest.in"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                      Facebook Page URL
                    </label>
                    <input
                      type="url"
                      value={contactForm.social_facebook}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, social_facebook: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] focus:border-[#B4233B] outline-none"
                      placeholder="https://facebook.com/craftnest.in"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                      YouTube Channel URL
                    </label>
                    <input
                      type="url"
                      value={contactForm.social_youtube}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, social_youtube: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] focus:border-[#B4233B] outline-none"
                      placeholder="https://youtube.com/@craftnest"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                      X / Twitter Profile URL
                    </label>
                    <input
                      type="url"
                      value={contactForm.social_twitter}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, social_twitter: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] focus:border-[#B4233B] outline-none"
                      placeholder="https://x.com/craftnest_in"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={contactSaving}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#B4233B] hover:bg-[#8F3034] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                {contactSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Contact Details & Update Website</span>
              </button>
            </form>

            {/* Right Column: Customer Site Preview of Contact Details (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-[#E6D8CC] p-6 shadow-xs space-y-4">
              <div className="border-b border-[#E6D8CC] pb-3">
                <h4 className="font-serif text-base font-bold text-[#2B2523]">
                  Storefront Appearance Preview
                </h4>
                <p className="text-xs text-[#6F625D]">
                  How customers see these details in the site footer & contact hub.
                </p>
              </div>

              {/* Footer Preview Card */}
              <div className="p-5 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC] space-y-4">
                <span className="text-[10px] font-bold text-[#B4233B] uppercase tracking-wider">
                  Customer Footer Preview
                </span>

                <div className="space-y-2 text-xs text-[#2B2523]">
                  <p className="font-serif font-bold text-sm text-[#B4233B]">
                    {contactForm.platform_name || 'CraftNest'}
                  </p>
                  <div className="flex items-start gap-2 text-[#6F625D]">
                    <MapPin className="w-4 h-4 text-[#B4233B] shrink-0 mt-0.5" />
                    <span>{contactForm.business_address || 'Address configured above'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#6F625D]">
                    <Phone className="w-4 h-4 text-[#B4233B] shrink-0" />
                    <span>{contactForm.support_phone || 'Phone'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#6F625D]">
                    <Mail className="w-4 h-4 text-[#B4233B] shrink-0" />
                    <span>{contactForm.support_email || 'Email'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#6F625D]">
                    <Clock className="w-4 h-4 text-[#B4233B] shrink-0" />
                    <span>{contactForm.working_hours || 'Hours'}</span>
                  </div>
                </div>

                {/* Social Badges Preview */}
                <div className="pt-2 border-t border-[#E6D8CC] flex items-center gap-2 text-xs text-[#6F625D]">
                  <span className="font-medium text-[11px]">Social:</span>
                  {contactForm.social_instagram && (
                    <span className="px-2 py-0.5 rounded-md bg-white border border-[#E6D8CC] text-[10px]">
                      Instagram
                    </span>
                  )}
                  {contactForm.social_facebook && (
                    <span className="px-2 py-0.5 rounded-md bg-white border border-[#E6D8CC] text-[10px]">
                      Facebook
                    </span>
                  )}
                  {contactForm.social_youtube && (
                    <span className="px-2 py-0.5 rounded-md bg-white border border-[#E6D8CC] text-[10px]">
                      YouTube
                    </span>
                  )}
                  {contactForm.social_twitter && (
                    <span className="px-2 py-0.5 rounded-md bg-white border border-[#E6D8CC] text-[10px]">
                      X
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================
          MODAL: ADD / EDIT BANNER
          ================================================================== */}
      {bannerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#E6D8CC] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#E6D8CC] pb-4">
              <h3 className="font-serif text-lg font-bold text-[#2B2523]">
                {editingBanner ? 'Edit Promotional Banner' : 'Publish New Promotional Banner'}
              </h3>
              <button
                type="button"
                onClick={() => setBannerModalOpen(false)}
                className="p-1.5 rounded-xl text-[#6F625D] hover:bg-[#FFF9F3] hover:text-[#2B2523] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-4">
              {/* Banner Title */}
              <div>
                <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                  Banner Headline / Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] focus:border-[#B4233B] outline-none"
                  placeholder="e.g. Timeless Blue Pottery of Jaipur"
                />
              </div>

              {/* Subtitle & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                    Subtitle / Badge Text
                  </label>
                  <input
                    type="text"
                    value={bannerForm.subtitle}
                    onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] focus:border-[#B4233B] outline-none"
                    placeholder="e.g. Direct From Master Artisans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                    Display Position <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={bannerForm.display_location}
                    onChange={(e) =>
                      setBannerForm({ ...bannerForm, display_location: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] bg-white focus:border-[#B4233B] outline-none"
                  >
                    <option value="homepage_hero">Homepage Main Hero</option>
                    <option value="homepage_secondary">Homepage Secondary Banner</option>
                    <option value="category_page">Category Page Top Banner</option>
                    <option value="promotional_section">Promotional Offer Spotlight</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                  Description / Body Copy
                </label>
                <textarea
                  rows={2}
                  value={bannerForm.description}
                  onChange={(e) => setBannerForm({ ...bannerForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] focus:border-[#B4233B] outline-none"
                  placeholder="e.g. Authentic handmade ceramics with Persian quartz glaze, crafted by registered GI artisans."
                />
              </div>

              {/* Desktop Banner Image Upload */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC]">
                <label className="block text-xs font-bold text-[#2B2523]">
                  Desktop Banner Image <span className="text-rose-600">*</span>
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {bannerForm.image_url ? (
                    <div className="w-28 h-16 rounded-xl overflow-hidden bg-black/20 border border-[#E6D8CC] shrink-0">
                      <img
                        src={bannerForm.image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-28 h-16 rounded-xl bg-white border border-dashed border-[#E6D8CC] flex items-center justify-center text-[#6F625D] shrink-0">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1 w-full space-y-2">
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#E6D8CC] text-xs font-semibold text-[#2B2523] hover:bg-[#F4E8DC]/40 cursor-pointer shadow-xs">
                      <Upload className="w-3.5 h-3.5 text-[#B4233B]" />
                      <span>{uploadingImage ? 'Uploading Image...' : 'Upload Image File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFileUpload(e, false)}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </label>
                    <input
                      type="url"
                      value={bannerForm.image_url}
                      onChange={(e) => setBannerForm({ ...bannerForm, image_url: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E6D8CC] text-xs text-[#2B2523] focus:border-[#B4233B] outline-none"
                      placeholder="Or paste direct image URL (https://...)"
                    />
                  </div>
                </div>
              </div>

              {/* Mobile Banner Image (Separate) */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-white border border-[#E6D8CC]">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#2B2523] flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-[#B4233B]" />
                    <span>Mobile-Specific Banner Image (Optional)</span>
                  </label>
                  {bannerForm.image_url && !bannerForm.mobile_image_url && (
                    <button
                      type="button"
                      onClick={() =>
                        setBannerForm((prev) => ({ ...prev, mobile_image_url: prev.image_url }))
                      }
                      className="text-[10px] font-semibold text-[#B4233B] hover:underline cursor-pointer"
                    >
                      Use Desktop Image
                    </button>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {bannerForm.mobile_image_url ? (
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/20 border border-[#E6D8CC] shrink-0">
                      <img
                        src={bannerForm.mobile_image_url}
                        alt="Mobile Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-[#FFF9F3] border border-dashed border-[#E6D8CC] flex items-center justify-center text-[#6F625D] shrink-0">
                      <Smartphone className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 w-full space-y-2">
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#E6D8CC] text-xs font-semibold text-[#2B2523] hover:bg-[#FFF9F3] cursor-pointer shadow-xs">
                      <Upload className="w-3.5 h-3.5 text-[#B4233B]" />
                      <span>{uploadingMobileImage ? 'Uploading Mobile Image...' : 'Upload Mobile Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFileUpload(e, true)}
                        className="hidden"
                        disabled={uploadingMobileImage}
                      />
                    </label>
                    <input
                      type="url"
                      value={bannerForm.mobile_image_url}
                      onChange={(e) =>
                        setBannerForm({ ...bannerForm, mobile_image_url: e.target.value })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E6D8CC] text-xs text-[#2B2523] focus:border-[#B4233B] outline-none"
                      placeholder="Optional separate mobile image URL (https://...)"
                    />
                  </div>
                </div>
              </div>

              {/* CTA Button Text & Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                    CTA Button Label
                  </label>
                  <input
                    type="text"
                    value={bannerForm.button_text}
                    onChange={(e) => setBannerForm({ ...bannerForm, button_text: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] focus:border-[#B4233B] outline-none"
                    placeholder="e.g. Explore Blue Pottery"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                    CTA Destination Link
                  </label>
                  <input
                    type="text"
                    value={bannerForm.button_link}
                    onChange={(e) => setBannerForm({ ...bannerForm, button_link: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] focus:border-[#B4233B] outline-none"
                    placeholder="e.g. /products?category=Pottery"
                  />
                </div>
              </div>

              {/* Scheduling: Start & Expiry Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC]">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#B4233B]" />
                    <span>Publish Start Date (Optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={bannerForm.start_date}
                    onChange={(e) => setBannerForm({ ...bannerForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-rose-600" />
                    <span>Expiry Date (Optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={bannerForm.expiry_date}
                    onChange={(e) => setBannerForm({ ...bannerForm, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] bg-white outline-none"
                  />
                </div>
              </div>

              {/* Status and Order */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                    Display Priority Order
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={bannerForm.display_order}
                    onChange={(e) =>
                      setBannerForm({ ...bannerForm, display_order: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="bannerActive"
                    checked={bannerForm.is_active}
                    onChange={(e) =>
                      setBannerForm({ ...bannerForm, is_active: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#B4233B] rounded cursor-pointer"
                  />
                  <label htmlFor="bannerActive" className="text-xs font-bold text-[#2B2523] cursor-pointer">
                    Publish Active Immediately
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E6D8CC]">
                <button
                  type="button"
                  onClick={() => setBannerModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E6D8CC] text-xs font-semibold text-[#6F625D] hover:bg-[#FFF9F3] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bannerSubmitting || uploadingImage || uploadingMobileImage}
                  className="px-6 py-2.5 rounded-xl bg-[#B4233B] hover:bg-[#8F3034] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {bannerSubmitting ? 'Saving Banner...' : editingBanner ? 'Update Banner' : 'Create Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================
          MODAL: ADD / EDIT PROMOTIONAL OFFER
          ================================================================== */}
      {couponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#E6D8CC] w-full max-w-lg shadow-2xl p-6 sm:p-8 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#E6D8CC] pb-4">
              <h3 className="font-serif text-lg font-bold text-[#2B2523]">
                {editingCoupon ? 'Edit Promotional Offer' : 'Create Promotional Offer'}
              </h3>
              <button
                type="button"
                onClick={() => setCouponModalOpen(false)}
                className="p-1.5 rounded-xl text-[#6F625D] hover:bg-[#FFF9F3] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                  Promotional Voucher Code <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={couponForm.code}
                  onChange={(e) =>
                    setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D8CC] text-xs font-mono font-bold uppercase tracking-wider text-[#B4233B] focus:border-[#B4233B] outline-none"
                  placeholder="e.g. DIWALI25, CRAFT100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                  Offer Title
                </label>
                <input
                  type="text"
                  value={couponForm.title}
                  onChange={(e) => setCouponForm({ ...couponForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] outline-none"
                  placeholder="e.g. Festive Heritage Special Discount"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                  Offer Description
                </label>
                <textarea
                  rows={2}
                  value={couponForm.description}
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] outline-none"
                  placeholder="e.g. Flat 15% off on handloom sarees and brass craft heirlooms."
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                    Discount Type
                  </label>
                  <select
                    value={couponForm.discount_type}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, discount_type: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] bg-white outline-none"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                    Discount Value <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    min={0}
                    value={couponForm.discount_value}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, discount_value: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] outline-none"
                    placeholder="15"
                  />
                </div>
              </div>

              {/* Min Order & Max Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                    Min Cart Order (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={couponForm.min_order_amount}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, min_order_amount: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] outline-none"
                    placeholder="999"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                    Max Discount Cap (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={couponForm.max_discount}
                    onChange={(e) =>
                      setCouponForm({ ...couponForm, max_discount: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] outline-none"
                    placeholder="Optional (e.g. 500)"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={couponForm.start_date}
                    onChange={(e) => setCouponForm({ ...couponForm, start_date: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="datetime-local"
                    value={couponForm.expiry_date}
                    onChange={(e) => setCouponForm({ ...couponForm, expiry_date: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[#E6D8CC] text-xs text-[#2B2523] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="couponActive"
                  checked={couponForm.is_active}
                  onChange={(e) =>
                    setCouponForm({ ...couponForm, is_active: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#B4233B] rounded cursor-pointer"
                />
                <label htmlFor="couponActive" className="text-xs font-bold text-[#2B2523] cursor-pointer">
                  Activate Offer Immediately
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E6D8CC]">
                <button
                  type="button"
                  onClick={() => setCouponModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E6D8CC] text-xs font-semibold text-[#6F625D] hover:bg-[#FFF9F3] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={couponSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#B4233B] hover:bg-[#8F3034] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {couponSubmitting ? 'Saving Offer...' : editingCoupon ? 'Update Offer' : 'Create Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================
          MODAL: BANNER PREVIEW MODAL
          ================================================================== */}
      {previewBannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#2B2523] rounded-3xl border border-[#E6D8CC]/40 w-full max-w-3xl overflow-hidden shadow-2xl animate-scaleUp text-white">
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-white/10">
              <span className="text-xs font-bold tracking-wider uppercase text-[#C69A5B] flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                <span>Storefront Live Banner Preview</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewBannerModal(null)}
                className="p-1 rounded-lg text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Desktop Banner Mockup */}
            <div className="relative min-h-[360px] flex items-center p-8 sm:p-12 overflow-hidden">
              <img
                src={previewBannerModal.image_url}
                alt={previewBannerModal.title}
                className="absolute inset-0 w-full h-full object-cover brightness-60"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />

              <div className="relative z-10 max-w-lg space-y-3">
                {previewBannerModal.subtitle && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#B4233B] text-white text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-[#C69A5B]" />
                    {previewBannerModal.subtitle}
                  </span>
                )}
                <h2 className="font-serif text-3xl sm:text-4xl font-bold leading-tight text-[#FFF9F3]">
                  {previewBannerModal.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#F4E8DC] leading-relaxed">
                  {previewBannerModal.description}
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#B4233B] text-white text-xs font-semibold shadow-md">
                    <span>{previewBannerModal.button_text || 'Explore Collection'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-black/40 border-t border-white/10 flex items-center justify-between text-xs text-white/70">
              <span>Display Position: {POSITION_LABELS[previewBannerModal.display_location]}</span>
              <button
                type="button"
                onClick={() => setPreviewBannerModal(null)}
                className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================
          MODAL: DELETE BANNER CONFIRMATION
          ================================================================== */}
      {deleteConfirmBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#E6D8CC] p-6 max-w-sm w-full space-y-4 shadow-xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-base font-bold text-[#2B2523]">
              Delete Promotional Banner?
            </h3>
            <p className="text-xs text-[#6F625D]">
              Are you sure you want to permanently remove "<strong>{deleteConfirmBanner.title}</strong>"? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmBanner(null)}
                className="px-4 py-2 rounded-xl border border-[#E6D8CC] text-xs font-semibold text-[#6F625D] hover:bg-[#FFF9F3] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBanner}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                Delete Banner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================
          MODAL: DELETE OFFER CONFIRMATION
          ================================================================== */}
      {deleteConfirmCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#E6D8CC] p-6 max-w-sm w-full space-y-4 shadow-xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-base font-bold text-[#2B2523]">
              Delete Promotional Offer?
            </h3>
            <p className="text-xs text-[#6F625D]">
              Are you sure you want to permanently remove coupon "<strong>{deleteConfirmCoupon.code}</strong>"?
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmCoupon(null)}
                className="px-4 py-2 rounded-xl border border-[#E6D8CC] text-xs font-semibold text-[#6F625D] hover:bg-[#FFF9F3] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCoupon}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                Delete Offer
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
