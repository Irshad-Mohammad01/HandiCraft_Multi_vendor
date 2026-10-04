import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  Shield,
  Store,
  ArrowUpRight,
  ArrowDownRight,
  Edit3,
  Layers,
  Clock,
  History,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Plus,
  Minus,
  Tag,
  DollarSign,
  Calendar,
  User,
  Info,
  ArrowLeft,
  ExternalLink,
  Save,
  Sliders,
  Check,
  FileText
} from 'lucide-react';
import { productsApi } from '../../api/products';
import LoadingSpinner from '../common/LoadingSpinner';

export default function ProductManagementDetail({ productId, currentUser, onProductUpdated }) {
  const navigate = useNavigate();
  const stockSectionRef = useRef(null);
  const bottomTabsRef = useRef(null);

  // Core product management state
  const [managementData, setManagementData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessForbidden, setAccessForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Active bottom tab
  const [bottomTab, setBottomTab] = useState('stock-history'); // 'stock-history' | 'audit-trail'

  // Image gallery state
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  // Stock Management Form state
  const [stockAction, setStockAction] = useState('increase'); // 'increase' | 'decrease' | 'set'
  const [stockValue, setStockValue] = useState('');
  const [stockReason, setStockReason] = useState('');
  const [submittingStock, setSubmittingStock] = useState(false);
  const [stockFeedback, setStockFeedback] = useState(null); // { type: 'success' | 'error', message: '' }

  // Stock History Pagination State
  const [stockHistoryList, setStockHistoryList] = useState([]);
  const [stockHistoryPage, setStockHistoryPage] = useState(1);
  const [stockHistoryTotalPages, setStockHistoryTotalPages] = useState(1);
  const [stockHistoryTotalCount, setStockHistoryTotalCount] = useState(0);
  const [loadingStockHistory, setLoadingStockHistory] = useState(false);

  // Audit Trail Pagination State
  const [auditLogsList, setAuditLogsList] = useState([]);
  const [auditLogsPage, setAuditLogsPage] = useState(1);
  const [auditLogsTotalPages, setAuditLogsTotalPages] = useState(1);
  const [auditLogsTotalCount, setAuditLogsTotalCount] = useState(0);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  // Update Product Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [categoriesList, setCategoriesList] = useState([]);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    price: '',
    original_price: '',
    status: 'active',
    images: []
  });
  const [newImageUrl, setNewImageUrl] = useState('');
  const [updatingProduct, setUpdatingProduct] = useState(false);
  const [editModalError, setEditModalError] = useState('');

  // 1. Fetch Primary Product Management Data
  const loadManagementData = async () => {
    setLoading(true);
    setAccessForbidden(false);
    setErrorMessage('');
    try {
      const data = await productsApi.getManagementDetails(productId);
      setManagementData(data);
      // Initialize edit form data
      const prod = data.product;
      setEditFormData({
        name: prod.name || '',
        description: prod.description || '',
        category_id: prod.category_id || '',
        price: prod.price || '',
        original_price: prod.original_price || '',
        status: prod.status || 'active',
        images: Array.isArray(prod.images) ? [...prod.images] : (prod.image ? [prod.image] : [])
      });
    } catch (err) {
      console.error('Failed to load product management detail:', err);
      if (err.response?.status === 403) {
        setAccessForbidden(true);
        setErrorMessage(
          err.response?.data?.message ||
          "Access denied. You do not have permission to view or manage another seller's handcrafted product."
        );
      } else {
        setErrorMessage(err.response?.data?.message || 'Failed to retrieve product details from platform database.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Stock History Records
  const loadStockHistory = async (page = 1) => {
    if (!productId || accessForbidden) return;
    setLoadingStockHistory(true);
    try {
      const res = await productsApi.getStockHistory(productId, { page, limit: 10 });
      setStockHistoryList(res.items || []);
      setStockHistoryPage(res.page || 1);
      setStockHistoryTotalPages(res.pages || 1);
      setStockHistoryTotalCount(res.total || 0);
    } catch (err) {
      console.error('Failed to load stock history:', err);
    } finally {
      setLoadingStockHistory(false);
    }
  };

  // 3. Fetch Product Audit Trail Records
  const loadAuditLogs = async (page = 1) => {
    if (!productId || accessForbidden) return;
    setLoadingAuditLogs(true);
    try {
      const res = await productsApi.getAuditLogs(productId, { page, limit: 10 });
      setAuditLogsList(res.items || []);
      setAuditLogsPage(res.page || 1);
      setAuditLogsTotalPages(res.pages || 1);
      setAuditLogsTotalCount(res.total || 0);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  // 4. Fetch Categories for Edit Modal
  const loadCategories = async () => {
    try {
      const res = await productsApi.getCategories();
      const list = Array.isArray(res) ? res : res?.categories || [];
      setCategoriesList(list);
    } catch (e) {
      console.error('Failed to load categories:', e);
    }
  };

  useEffect(() => {
    loadManagementData();
    loadCategories();
  }, [productId]);

  useEffect(() => {
    if (managementData && !accessForbidden) {
      loadStockHistory(stockHistoryPage);
      loadAuditLogs(auditLogsPage);
    }
  }, [managementData, accessForbidden]);

  // Gallery image helper
  const galleryImages = useMemo(() => {
    if (!managementData?.product) return [];
    const prod = managementData.product;
    let list = [];
    if (Array.isArray(prod.images) && prod.images.length > 0) {
      list = prod.images.map((img) => (typeof img === 'string' ? img : img.image_url)).filter(Boolean);
    } else if (prod.image) {
      list = [prod.image];
    } else if (prod.image_url) {
      list = [prod.image_url];
    }
    if (list.length === 0) {
      list = ['https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1000&q=80'];
    }
    return list;
  }, [managementData]);

  // Stock Adjustment Submission
  const handleStockSubmit = async (e) => {
    e.preventDefault();
    setStockFeedback(null);

    const val = parseInt(stockValue, 10);
    if (isNaN(val) || val < 0) {
      setStockFeedback({ type: 'error', message: 'Please enter a valid non-negative number of units.' });
      return;
    }

    const currentStock = managementData?.product?.stock || 0;
    if (stockAction === 'decrease' && currentStock - val < 0) {
      setStockFeedback({
        type: 'error',
        message: `Cannot reduce by ${val} units. Current available stock is only ${currentStock} units.`
      });
      return;
    }

    setSubmittingStock(true);
    try {
      const res = await productsApi.adjustStock(productId, {
        action: stockAction,
        value: val,
        reason: stockReason.trim() || undefined
      });

      setStockFeedback({
        type: 'success',
        message: res.message || `Successfully adjusted stock. New stock: ${res.new_stock} units.`
      });
      setStockValue('');
      setStockReason('');

      // Refresh management data, history, and audit
      await loadManagementData();
      await loadStockHistory(1);
      await loadAuditLogs(1);
      if (onProductUpdated) onProductUpdated();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update stock. Please try again.';
      setStockFeedback({ type: 'error', message: msg });
    } finally {
      setSubmittingStock(false);
    }
  };

  // Product Update Submission
  const handleEditProductSubmit = async (e) => {
    e.preventDefault();
    setEditModalError('');

    if (!editFormData.name.trim()) {
      setEditModalError('Product name is required.');
      return;
    }
    if (!editFormData.price || parseFloat(editFormData.price) <= 0) {
      setEditModalError('Valid selling price is required.');
      return;
    }

    setUpdatingProduct(true);
    try {
      const payload = {
        name: editFormData.name.trim(),
        description: editFormData.description.trim(),
        category_id: editFormData.category_id || undefined,
        price: parseFloat(editFormData.price),
        status: editFormData.status,
        images: editFormData.images.length > 0 ? editFormData.images : undefined
      };

      await productsApi.updateProduct(productId, payload);
      setShowEditModal(false);
      await loadManagementData();
      await loadAuditLogs(1);
      if (onProductUpdated) onProductUpdated();
    } catch (err) {
      setEditModalError(err.response?.data?.message || 'Failed to update product details.');
    } finally {
      setUpdatingProduct(false);
    }
  };

  const handleAddImageToForm = () => {
    if (!newImageUrl.trim()) return;
    setEditFormData((prev) => ({
      ...prev,
      images: [...prev.images, newImageUrl.trim()]
    }));
    setNewImageUrl('');
  };

  const handleRemoveImageFromForm = (idx) => {
    setEditFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx)
    }));
  };

  // -------------------------------------------------------------
  // RENDERING: LOADING & ACCESS FORBIDDEN STATES
  // -------------------------------------------------------------
  if (loading) {
    return (
      <div className="py-24 text-center">
        <LoadingSpinner text="Loading Product Management Console..." />
      </div>
    );
  }

  // Strict RBAC: Seller tried to access another seller's product
  if (accessForbidden) {
    return (
      <div className="craft-container py-12 sm:py-20 max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border-2 border-[#B84242]/30 craft-card-shadow text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-[#B84242]/10 text-[#B84242] flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#B84242]/10 text-[#B84242] mb-3">
              Role Permission Boundary (403 Forbidden)
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2B2523] mb-3">
              Artisan Privacy & Ownership Restriction
            </h2>
            <p className="text-sm text-[#6F625D] max-w-xl mx-auto leading-relaxed">
              {errorMessage}
            </p>
          </div>

          <div className="p-4 bg-[#FFF9F3] rounded-2xl border border-[#E6D8CC] text-xs text-[#2B2523] text-left max-w-lg mx-auto space-y-1">
            <div className="font-semibold text-[#A63D40] flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              <span>Multi-Tenant Artisan Isolation Policy</span>
            </div>
            <p className="text-[#6F625D]">
              Verified artisans on CraftNest can only inspect stock levels, modify catalogue data, and review internal audit logs for items registered to their own cooperative workshop.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/seller/dashboard')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs font-semibold shadow-md transition-all cursor-pointer"
            >
              <Store className="w-4 h-4" />
              <span>Return to My Artisan Dashboard</span>
            </button>
            <Link
              to="/products"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-white border border-[#E6D8CC] text-[#2B2523] hover:bg-[#FFF9F3] text-xs font-semibold transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Browse Public Storefront</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage || !managementData?.product) {
    return (
      <div className="craft-container py-16 text-center">
        <div className="bg-white rounded-3xl p-8 max-w-lg mx-auto border border-[#E6D8CC]">
          <AlertTriangle className="w-10 h-10 text-[#B84242] mx-auto mb-3" />
          <h3 className="font-serif text-xl font-bold text-[#2B2523] mb-2">Item Unavailable</h3>
          <p className="text-xs text-[#6F625D] mb-4">{errorMessage || 'Product record could not be loaded.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl bg-[#A63D40] text-white text-xs font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { product, seller, is_owner, is_seller } = managementData;
  const inStock = Number(product.stock || 0) > 0;
  const isLowStock = Number(product.stock || 0) > 0 && Number(product.stock || 0) <= 5;
  const createdDateFormatted = product.created_at
    ? new Date(product.created_at).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Not Recorded';
  const updatedDateFormatted = product.updated_at
    ? new Date(product.updated_at).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : createdDateFormatted;

  return (
    <div className="safe-bottom-padding pb-16 bg-[#FFFDF9]">
      {/* ==========================================================
          TOP SECTION: BREADCRUMB, PRODUCT NAME, ROLE BADGE & STATUS
          ========================================================== */}
      <div className="bg-[#F4E8DC]/50 border-b border-[#E6D8CC] py-3.5">
        <div className="craft-container flex flex-col md:flex-row md:items-center justify-between gap-3">
          <nav aria-label="Breadcrumb">
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
                {is_owner ? (
                  <Link to="/owner/products" className="hover:text-[#A63D40] transition-colors font-medium">
                    Owner Catalog
                  </Link>
                ) : (
                  <Link to="/seller/dashboard" className="hover:text-[#A63D40] transition-colors font-medium">
                    Seller Portal
                  </Link>
                )}
              </li>
              <li>
                <ChevronRight className="w-3.5 h-3.5 text-[#6F625D]/60" />
              </li>
              <li className="text-[#2B2523] font-semibold truncate max-w-[200px] sm:max-w-xs">
                {product.name}
              </li>
            </ol>
          </nav>

          {/* Role & Dashboard Quick Navigation Indicators */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                is_owner
                  ? 'bg-[#A63D40] text-white shadow-xs'
                  : 'bg-[#C69A5B] text-white shadow-xs'
              }`}
            >
              {is_owner ? <Shield className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
              <span>{is_owner ? 'Platform Owner Console' : 'Artisan Seller Console'}</span>
            </span>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                product.status === 'active'
                  ? 'bg-[#3F7D5A]/10 text-[#3F7D5A] border-[#3F7D5A]/30'
                  : 'bg-[#6F625D]/10 text-[#6F625D] border-[#6F625D]/30'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${product.status === 'active' ? 'bg-[#3F7D5A]' : 'bg-[#6F625D]'}`} />
              <span>Status: {product.status ? product.status.toUpperCase() : 'ACTIVE'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Header Banner with Action Buttons */}
      <section className="craft-container pt-6 sm:pt-8 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E6D8CC] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#A63D40]">
                Product Management Detail
              </span>
              <span className="text-xs text-[#6F625D]">· Product ID: #{product.id}</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#2B2523] leading-tight">
              {product.name}
            </h1>
          </div>

          {/* Quick Jump Action Bar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Update Product</span>
            </button>

            <button
              type="button"
              onClick={() => stockSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFF9F3] border border-[#C69A5B] text-[#A63D40] hover:bg-[#F4E8DC] text-xs font-semibold transition-all cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-[#C69A5B]" />
              <span>Manage Stock</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setBottomTab('stock-history');
                bottomTabsRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E6D8CC] text-[#2B2523] hover:bg-[#FFF9F3] text-xs font-semibold transition-all cursor-pointer"
            >
              <History className="w-4 h-4 text-[#6F625D]" />
              <span>View Stock History</span>
            </button>
          </div>
        </div>
      </section>

      {/* ==========================================================
          MAIN SECTION: LEFT (IMAGE GALLERY) | RIGHT (PRODUCT INFO & STOCK)
          ========================================================== */}
      <section className="craft-container pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          
          {/* --------------------------------------------------------
              LEFT COLUMN: PRODUCT IMAGE GALLERY (5 of 12 cols)
              -------------------------------------------------------- */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="bg-white rounded-3xl p-4 border border-[#E6D8CC] craft-card-shadow">
              {/* Large Image Box */}
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center p-2 group">
                {!imageError ? (
                  <img
                    src={galleryImages[selectedImageIndex]}
                    alt={product.name}
                    loading="eager"
                    onError={() => setImageError(true)}
                    className="w-full h-full object-contain object-center transition-all duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-[#6F625D] p-6 text-center">
                    <ImageOff className="w-12 h-12 text-[#A63D40]/40 mb-2" />
                    <p className="text-sm font-semibold">Artisan Handcraft Visual</p>
                    <p className="text-xs text-[#6F625D]">Image stored in regional repository</p>
                  </div>
                )}

                {/* Status Overlay Badge */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  <span
                    className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-xs ${
                      inStock
                        ? isLowStock
                          ? 'bg-[#C69A5B] text-white'
                          : 'bg-[#3F7D5A] text-white'
                        : 'bg-[#B84242] text-white'
                    }`}
                  >
                    {inStock ? (isLowStock ? `Low Stock (${product.stock})` : `In Stock (${product.stock})`) : 'Out of Stock'}
                  </span>
                </div>

                {/* Image Navigation Arrows */}
                {galleryImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)
                      }
                      aria-label="Previous Image"
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 text-[#2B2523] hover:bg-[#A63D40] hover:text-white shadow-md transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedImageIndex((prev) => (prev + 1) % galleryImages.length)
                      }
                      aria-label="Next Image"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 text-[#2B2523] hover:bg-[#A63D40] hover:text-white shadow-md transition-all cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails row */}
              {galleryImages.length > 1 && (
                <div className="flex items-center gap-2.5 overflow-x-auto pt-3 pb-1">
                  {galleryImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedImageIndex(idx);
                        setImageError(false);
                      }}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 bg-[#FFF9F3] p-1 transition-all cursor-pointer ${
                        selectedImageIndex === idx
                          ? 'border-[#A63D40] ring-2 ring-[#A63D40]/20'
                          : 'border-[#E6D8CC] hover:border-[#A63D40]/50 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}

              {/* Quick Image Upload Action */}
              <div className="pt-3 border-t border-[#E6D8CC] mt-3 flex items-center justify-between text-xs text-[#6F625D]">
                <span>{galleryImages.length} image(s) configured</span>
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="text-[#A63D40] font-semibold hover:underline cursor-pointer"
                >
                  Manage Gallery
                </button>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------
              RIGHT COLUMN: PRODUCT INFORMATION & STOCK MANAGEMENT (7 of 12)
              -------------------------------------------------------- */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            
            {/* 1. PRODUCT INFORMATION SECTION */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6D8CC] craft-card-shadow space-y-6">
              <div className="flex items-center justify-between border-b border-[#E6D8CC] pb-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#A63D40]" />
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-[#2B2523]">
                    Product Specification & Master Record
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A63D40] hover:underline cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC]">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-[#6F625D] block mb-1">
                    Selling Price
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-2xl font-bold text-[#A63D40]">
                      ₹{Number(product.price || 0).toLocaleString('en-IN')}
                    </span>
                    {product.original_price && Number(product.original_price) > Number(product.price) && (
                      <span className="text-xs text-[#6F625D] line-through">
                        ₹{Number(product.original_price).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC]">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-[#6F625D] block mb-1">
                    Available Stock
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-serif text-2xl font-bold ${
                        inStock ? (isLowStock ? 'text-[#C69A5B]' : 'text-[#3F7D5A]') : 'text-[#B84242]'
                      }`}
                    >
                      {product.stock || 0} units
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                        inStock ? 'bg-[#3F7D5A]/10 text-[#3F7D5A]' : 'bg-[#B84242]/10 text-[#B84242]'
                      }`}
                    >
                      {inStock ? 'Active' : 'Depleted'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC]">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-[#6F625D] block mb-1">
                    Craft Category
                  </span>
                  <span className="text-sm font-semibold text-[#2B2523]">
                    {product.category || 'Uncategorized Craft'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC]">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-[#6F625D] block mb-1">
                    Artisan / Seller Guild
                  </span>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-[#2B2523]">
                    <Store className="w-3.5 h-3.5 text-[#C69A5B]" />
                    <span>{seller?.name || product.created_by || 'Main Owner Heritage Vault'}</span>
                  </div>
                  {seller?.artisan_cluster && (
                    <span className="text-[11px] text-[#6F625D] block mt-0.5">
                      Cluster: {seller.artisan_cluster}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] uppercase tracking-wider font-bold text-[#6F625D] block">
                  Product Narrative & Description
                </span>
                <p className="text-xs sm:text-sm text-[#2B2523] leading-relaxed bg-[#FFF9F3]/60 p-4 rounded-2xl border border-[#E6D8CC]">
                  {product.description || 'No descriptive narrative recorded for this handcrafted item.'}
                </p>
              </div>

              {/* Timestamps & Audit Identity Footer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-[#6F625D] border-t border-[#E6D8CC]">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#C69A5B]" />
                  <span>Created: {createdDateFormatted}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#3F7D5A]" />
                  <span>Last Modified: {updatedDateFormatted}</span>
                </div>
              </div>
            </div>

            {/* 2. STOCK MANAGEMENT SECTION */}
            <div
              ref={stockSectionRef}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6D8CC] craft-card-shadow space-y-6"
            >
              <div className="flex items-center justify-between border-b border-[#E6D8CC] pb-4">
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-[#2B2523] flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-[#A63D40]" />
                    <span>Stock Management & Inventory Adjustment</span>
                  </h3>
                  <p className="text-xs text-[#6F625D] mt-0.5">
                    Modifications are instantly committed to Neon PostgreSQL database and written to audit history.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[#6F625D] block">Current Stock</span>
                  <span className="font-serif text-2xl font-bold text-[#A63D40]">
                    {product.stock || 0}
                  </span>
                </div>
              </div>

              {/* Stock Form Feedback Alert */}
              {stockFeedback && (
                <div
                  className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 border ${
                    stockFeedback.type === 'success'
                      ? 'bg-[#3F7D5A]/10 text-[#3F7D5A] border-[#3F7D5A]/30'
                      : 'bg-[#B84242]/10 text-[#B84242] border-[#B84242]/30'
                  }`}
                >
                  {stockFeedback.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{stockFeedback.message}</span>
                </div>
              )}

              <form onSubmit={handleStockSubmit} className="space-y-4">
                {/* Action Selector Tabs */}
                <div>
                  <label className="block text-xs font-bold text-[#2B2523] uppercase tracking-wider mb-2">
                    Select Adjustment Operation *
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setStockAction('increase')}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        stockAction === 'increase'
                          ? 'bg-[#3F7D5A] text-white border-[#3F7D5A] shadow-xs'
                          : 'bg-[#FFF9F3] text-[#2B2523] border-[#E6D8CC] hover:bg-white'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Stock</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStockAction('decrease')}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        stockAction === 'decrease'
                          ? 'bg-[#B84242] text-white border-[#B84242] shadow-xs'
                          : 'bg-[#FFF9F3] text-[#2B2523] border-[#E6D8CC] hover:bg-white'
                      }`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span>Reduce Stock</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStockAction('set')}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        stockAction === 'set'
                          ? 'bg-[#C69A5B] text-white border-[#C69A5B] shadow-xs'
                          : 'bg-[#FFF9F3] text-[#2B2523] border-[#E6D8CC] hover:bg-white'
                      }`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Set Exact Units</span>
                    </button>
                  </div>
                </div>

                {/* Stock Input & Quick Pill increments */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#2B2523] mb-1.5">
                      {stockAction === 'set' ? 'New Total Stock Units *' : 'Number of Units *'}
                    </label>
                    <input
                      type="number"
                      min={stockAction === 'decrease' ? '1' : '0'}
                      max={stockAction === 'decrease' ? String(product.stock || 0) : '99999'}
                      required
                      value={stockValue}
                      onChange={(e) => setStockValue(e.target.value)}
                      placeholder={stockAction === 'set' ? 'e.g. 25' : 'e.g. 5'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D8CC] bg-[#FFF9F3] text-sm text-[#2B2523] focus:outline-none focus:ring-2 focus:ring-[#A63D40]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2B2523] mb-1.5">
                      Quick Preset Values
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {(stockAction === 'set' ? [5, 10, 20, 50] : [1, 5, 10, 25]).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setStockValue(String(n))}
                          className="px-3 py-1.5 rounded-lg bg-[#FFF9F3] hover:bg-[#F4E8DC] border border-[#E6D8CC] text-xs font-semibold text-[#A63D40] transition-colors cursor-pointer"
                        >
                          {stockAction === 'increase' ? `+${n}` : stockAction === 'decrease' ? `-${n}` : `${n}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Adjustment Reason Field (Mandatory Audit Requirement) */}
                <div>
                  <label className="block text-xs font-bold text-[#2B2523] mb-1.5">
                    Stock Adjustment Reason *
                  </label>
                  <input
                    type="text"
                    required
                    value={stockReason}
                    onChange={(e) => setStockReason(e.target.value)}
                    placeholder="e.g. New batch received from Jaipur pottery cluster / Store inventory audit"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D8CC] bg-[#FFF9F3] text-sm text-[#2B2523] focus:outline-none focus:ring-2 focus:ring-[#A63D40]/30"
                  />
                  <div className="flex items-center gap-1.5 overflow-x-auto pt-2 text-[11px] text-[#6F625D]">
                    <span className="shrink-0 font-medium">Presets:</span>
                    {[
                      'New batch received from artisan cooperative',
                      'Inventory audit reconciliation',
                      'Damaged item removal from showroom',
                      'Returned parcel repackaged'
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setStockReason(preset)}
                        className="shrink-0 px-2 py-1 rounded bg-[#F4E8DC]/50 hover:bg-[#F4E8DC] text-[#2B2523] transition-colors cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submittingStock}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-8 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{submittingStock ? 'Recording Adjustment in Database...' : 'Commit Stock Adjustment'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================
          BOTTOM SECTION: TABBED HISTORICAL RECORDS (STOCK HISTORY & AUDIT TRAIL)
          ========================================================== */}
      <section ref={bottomTabsRef} className="craft-container pt-12 sm:pt-16">
        <div className="bg-white rounded-3xl border border-[#E6D8CC] overflow-hidden craft-card-shadow">
          {/* Tabs Navigation Header */}
          <div className="flex border-b border-[#E6D8CC] bg-[#FFF9F3] overflow-x-auto">
            <button
              type="button"
              onClick={() => setBottomTab('stock-history')}
              className={`py-4 px-6 text-xs sm:text-sm font-semibold transition-colors shrink-0 cursor-pointer border-b-2 flex items-center gap-2 ${
                bottomTab === 'stock-history'
                  ? 'border-[#A63D40] text-[#A63D40] bg-white'
                  : 'border-transparent text-[#6F625D] hover:text-[#2B2523]'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Stock Adjustment History ({stockHistoryTotalCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setBottomTab('audit-trail')}
              className={`py-4 px-6 text-xs sm:text-sm font-semibold transition-colors shrink-0 cursor-pointer border-b-2 flex items-center gap-2 ${
                bottomTab === 'audit-trail'
                  ? 'border-[#A63D40] text-[#A63D40] bg-white'
                  : 'border-transparent text-[#6F625D] hover:text-[#2B2523]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Product Audit Trail ({auditLogsTotalCount})</span>
            </button>
          </div>

          {/* TAB 1: STOCK HISTORY TABLE */}
          {bottomTab === 'stock-history' && (
            <div className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-serif text-lg font-bold text-[#2B2523]">
                    Recorded Stock Adjustment History
                  </h4>
                  <p className="text-xs text-[#6F625D]">
                    Historical ledger of every inventory mutation, replenishment, and patron checkout.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadStockHistory(stockHistoryPage)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6D8CC] text-xs font-semibold text-[#6F625D] hover:text-[#2B2523] hover:bg-[#FFF9F3] transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingStockHistory ? 'animate-spin' : ''}`} />
                  <span>Refresh Ledger</span>
                </button>
              </div>

              {loadingStockHistory ? (
                <div className="py-12 text-center">
                  <LoadingSpinner text="Querying stock history ledger..." />
                </div>
              ) : stockHistoryList.length === 0 ? (
                <div className="p-12 text-center bg-[#FFF9F3] rounded-2xl border border-[#E6D8CC]">
                  <History className="w-10 h-10 text-[#C69A5B] mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-[#2B2523]">No stock adjustment records yet</p>
                  <p className="text-xs text-[#6F625D] mt-1">
                    When you add, reduce, or patron orders consume stock, all ledger entries will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-[#E6D8CC] rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#FFF9F3] border-b border-[#E6D8CC] text-[#2B2523]">
                        <th className="py-3 px-4 font-bold">Date & Time</th>
                        <th className="py-3 px-4 font-bold">Previous Stock</th>
                        <th className="py-3 px-4 font-bold">Change</th>
                        <th className="py-3 px-4 font-bold">New Stock</th>
                        <th className="py-3 px-4 font-bold">Reason</th>
                        <th className="py-3 px-4 font-bold">Updated By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6D8CC]">
                      {stockHistoryList.map((entry, idx) => {
                        const changeNum = Number(entry.change || entry.change_amount || 0);
                        const isPositive = changeNum > 0;
                        const isZero = changeNum === 0;
                        const dateFormatted = entry.created_at || entry.date_time
                          ? new Date(entry.created_at || entry.date_time).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Recorded';

                        return (
                          <tr key={entry.id || idx} className="hover:bg-[#FFF9F3]/60 transition-colors">
                            <td className="py-3.5 px-4 font-medium text-[#2B2523] whitespace-nowrap">
                              {dateFormatted}
                            </td>
                            <td className="py-3.5 px-4 text-[#6F625D] whitespace-nowrap font-medium">
                              {entry.previous_stock ?? entry.old_stock} units
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full ${
                                  isPositive
                                    ? 'bg-[#3F7D5A]/10 text-[#3F7D5A]'
                                    : isZero
                                    ? 'bg-[#6F625D]/10 text-[#6F625D]'
                                    : 'bg-[#B84242]/10 text-[#B84242]'
                                }`}
                              >
                                {isPositive ? <ArrowUpRight className="w-3 h-3" /> : !isZero && <ArrowDownRight className="w-3 h-3" />}
                                <span>{isPositive ? `+${changeNum}` : changeNum}</span>
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-[#2B2523] whitespace-nowrap">
                              {entry.new_stock} units
                            </td>
                            <td className="py-3.5 px-4 text-[#2B2523] max-w-xs">
                              {entry.reason || 'Manual Adjustment'}
                            </td>
                            <td className="py-3.5 px-4 text-[#6F625D] whitespace-nowrap">
                              <div className="font-semibold text-[#2B2523]">
                                {entry.updated_by || 'Administrator'}
                              </div>
                              {entry.user_role && (
                                <span className="text-[10px] text-[#A63D40] uppercase font-bold tracking-wider">
                                  {entry.user_role}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Stock History Pagination */}
              {stockHistoryTotalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-[#E6D8CC] text-xs">
                  <span className="text-[#6F625D]">
                    Page {stockHistoryPage} of {stockHistoryTotalPages} ({stockHistoryTotalCount} total records)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={stockHistoryPage <= 1}
                      onClick={() => {
                        const newPage = stockHistoryPage - 1;
                        setStockHistoryPage(newPage);
                        loadStockHistory(newPage);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-[#E6D8CC] text-[#2B2523] hover:bg-[#FFF9F3] disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={stockHistoryPage >= stockHistoryTotalPages}
                      onClick={() => {
                        const newPage = stockHistoryPage + 1;
                        setStockHistoryPage(newPage);
                        loadStockHistory(newPage);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-[#E6D8CC] text-[#2B2523] hover:bg-[#FFF9F3] disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PRODUCT AUDIT TRAIL TABLE */}
          {bottomTab === 'audit-trail' && (
            <div className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-serif text-lg font-bold text-[#2B2523]">
                    Immutable Product Audit Trail
                  </h4>
                  <p className="text-xs text-[#6F625D]">
                    Verifiable cryptographic record of catalog changes: pricing, naming, descriptions, status, and media.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadAuditLogs(auditLogsPage)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6D8CC] text-xs font-semibold text-[#6F625D] hover:text-[#2B2523] hover:bg-[#FFF9F3] transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingAuditLogs ? 'animate-spin' : ''}`} />
                  <span>Refresh Trail</span>
                </button>
              </div>

              {loadingAuditLogs ? (
                <div className="py-12 text-center">
                  <LoadingSpinner text="Retrieving audit log entries..." />
                </div>
              ) : auditLogsList.length === 0 ? (
                <div className="p-12 text-center bg-[#FFF9F3] rounded-2xl border border-[#E6D8CC]">
                  <FileText className="w-10 h-10 text-[#C69A5B] mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-[#2B2523]">No audit logs recorded yet</p>
                  <p className="text-xs text-[#6F625D] mt-1">
                    Modifications to title, price, descriptions, or stock will automatically generate immutable audit logs.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-[#E6D8CC] rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#FFF9F3] border-b border-[#E6D8CC] text-[#2B2523]">
                        <th className="py-3 px-4 font-bold">Date & Time</th>
                        <th className="py-3 px-4 font-bold">Activity</th>
                        <th className="py-3 px-4 font-bold">Previous Value</th>
                        <th className="py-3 px-4 font-bold">New Value</th>
                        <th className="py-3 px-4 font-bold">Performed By</th>
                        <th className="py-3 px-4 font-bold">User Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6D8CC]">
                      {auditLogsList.map((log, idx) => {
                        const dateFormatted = log.created_at || log.date_time
                          ? new Date(log.created_at || log.date_time).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Recorded';

                        return (
                          <tr key={log.id || idx} className="hover:bg-[#FFF9F3]/60 transition-colors">
                            <td className="py-3.5 px-4 font-medium text-[#2B2523] whitespace-nowrap">
                              {dateFormatted}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold bg-[#FFF9F3] border border-[#E6D8CC] text-[#A63D40]">
                                {log.activity || log.action_type || 'Product Update'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-[#6F625D] max-w-xs truncate">
                              {log.previous_value !== null && log.previous_value !== undefined && log.previous_value !== ''
                                ? String(log.previous_value)
                                : '—'}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-[#2B2523] max-w-xs truncate">
                              {log.new_value !== null && log.new_value !== undefined && log.new_value !== ''
                                ? String(log.new_value)
                                : '—'}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-[#2B2523] whitespace-nowrap">
                              {log.performed_by || log.admin_id || 'System'}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-[#A63D40]/10 text-[#A63D40]">
                                {log.user_role || 'Owner'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Audit Logs Pagination */}
              {auditLogsTotalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-[#E6D8CC] text-xs">
                  <span className="text-[#6F625D]">
                    Page {auditLogsPage} of {auditLogsTotalPages} ({auditLogsTotalCount} total records)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={auditLogsPage <= 1}
                      onClick={() => {
                        const newPage = auditLogsPage - 1;
                        setAuditLogsPage(newPage);
                        loadAuditLogs(newPage);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-[#E6D8CC] text-[#2B2523] hover:bg-[#FFF9F3] disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={auditLogsPage >= auditLogsTotalPages}
                      onClick={() => {
                        const newPage = auditLogsPage + 1;
                        setAuditLogsPage(newPage);
                        loadAuditLogs(newPage);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-[#E6D8CC] text-[#2B2523] hover:bg-[#FFF9F3] disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ==========================================================
          MODAL: UPDATE PRODUCT ATTRIBUTES
          ========================================================== */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 border border-[#E6D8CC] craft-card-shadow space-y-6">
            <div className="flex items-center justify-between border-b border-[#E6D8CC] pb-4">
              <div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#2B2523]">
                  Update Product Information
                </h3>
                <p className="text-xs text-[#6F625D]">
                  Changes will be tracked in the Product Audit Trail.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg text-[#6F625D] hover:bg-[#FFF9F3] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editModalError && (
              <div className="p-3.5 rounded-2xl bg-[#B84242]/10 border border-[#B84242]/30 text-[#B84242] text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editModalError}</span>
              </div>
            )}

            <form onSubmit={handleEditProductSubmit} className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-[#2B2523] uppercase tracking-wider mb-1.5">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="e.g. Handcrafted Jaipur Blue Pottery Floral Vase"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D8CC] bg-[#FFF9F3] text-sm text-[#2B2523] focus:outline-none focus:ring-2 focus:ring-[#A63D40]/30"
                />
              </div>

              {/* Price & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#2B2523] uppercase tracking-wider mb-1.5">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={editFormData.price}
                    onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                    placeholder="2499.00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D8CC] bg-[#FFF9F3] text-sm text-[#2B2523] focus:outline-none focus:ring-2 focus:ring-[#A63D40]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2B2523] uppercase tracking-wider mb-1.5">
                    Craft Discipline / Category *
                  </label>
                  <select
                    value={editFormData.category_id}
                    onChange={(e) => setEditFormData({ ...editFormData, category_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D8CC] bg-[#FFF9F3] text-sm text-[#2B2523] focus:outline-none focus:ring-2 focus:ring-[#A63D40]/30"
                  >
                    <option value="">Select Category</option>
                    {categoriesList.map((cat) => (
                      <option key={cat.id || cat._id} value={cat.id || cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-[#2B2523] uppercase tracking-wider mb-1.5">
                  Product Publication Status *
                </label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D8CC] bg-[#FFF9F3] text-sm text-[#2B2523] focus:outline-none focus:ring-2 focus:ring-[#A63D40]/30"
                >
                  <option value="active">Active (Visible on Marketplace)</option>
                  <option value="inactive">Inactive (Hidden from Marketplace)</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[#2B2523] uppercase tracking-wider mb-1.5">
                  Narrative Description
                </label>
                <textarea
                  rows={4}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Describe the craft lineage, materials, ancestral technique, and provenance..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D8CC] bg-[#FFF9F3] text-sm text-[#2B2523] focus:outline-none focus:ring-2 focus:ring-[#A63D40]/30"
                />
              </div>

              {/* Product Images List */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#2B2523] uppercase tracking-wider">
                  Product Image URLs
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://example.com/craft-photo.jpg"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-[#E6D8CC] bg-[#FFF9F3] text-xs text-[#2B2523]"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageToForm}
                    className="px-4 py-2 rounded-xl bg-[#C69A5B] text-white text-xs font-semibold hover:bg-[#B77935] transition-colors cursor-pointer"
                  >
                    Add URL
                  </button>
                </div>

                {editFormData.images.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-2">
                    {editFormData.images.map((url, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFF9F3] border border-[#E6D8CC] text-xs text-[#2B2523]"
                      >
                        <span className="truncate max-w-[180px]">{url}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveImageFromForm(i)}
                          className="text-[#B84242] hover:opacity-80 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-[#E6D8CC] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-[#E6D8CC] text-xs font-semibold text-[#6F625D] hover:bg-[#FFF9F3] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingProduct}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{updatingProduct ? 'Saving Updates...' : 'Update Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
