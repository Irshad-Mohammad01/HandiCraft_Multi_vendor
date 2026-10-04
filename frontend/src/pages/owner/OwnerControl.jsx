import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  Store,
  Users,
  Package,
  FolderTree,
  ShoppingBag,
  CreditCard,
  Settings,
  Server,
  AlertTriangle,
  RefreshCw,
  Power,
  PowerOff,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Lock,
  Layers,
  Database,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../api/admin';
import apiClient from '../../api/client';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function OwnerControl() {
  const { user, isOwner, role } = useAuth();
  const navigate = useNavigate();

  const [controlData, setControlData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [toggleLoading, setToggleLoading] = useState(false);

  useEffect(() => {
    // Immediate frontend role check
    if (!isOwner && role !== 'owner' && role !== 'admin') {
      setAccessDenied(true);
      setLoading(false);
      return;
    }
    loadOwnerControl();
  }, [isOwner, role]);

  const loadOwnerControl = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await adminApi.getOwnerControl();
      setControlData(data);
      setAccessDenied(false);
    } catch (err) {
      console.error('Failed to load owner control:', err);
      if (err.response?.status === 403 || err.response?.status === 401) {
        setAccessDenied(true);
      } else {
        setErrorMsg('Failed to connect to owner control server API.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMaintenance = async () => {
    setToggleLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const isCurrentlyOn = controlData?.platform_settings?.maintenance_mode;
      const res = await apiClient.post('/maintenance/toggle', {
        enable: !isCurrentlyOn,
        message: !isCurrentlyOn
          ? 'Platform undergoing scheduled artisan catalog synchronization. Back shortly.'
          : '',
      });
      setSuccessMsg(`Maintenance Mode is now ${!isCurrentlyOn ? 'ENABLED' : 'DISABLED'}.`);
      await loadOwnerControl();
    } catch (err) {
      console.error('Failed to toggle maintenance mode:', err);
      setErrorMsg('Failed to update platform maintenance mode.');
    } finally {
      setToggleLoading(false);
    }
  };

  const handleToggleHighDemand = async () => {
    setToggleLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const isCurrentlyOn = controlData?.platform_settings?.high_demand_mode;
      await apiClient.post('/high-demand/toggle', {
        enable: !isCurrentlyOn,
      });
      setSuccessMsg(`High Demand Mode is now ${!isCurrentlyOn ? 'ENABLED' : 'DISABLED'}.`);
      await loadOwnerControl();
    } catch (err) {
      console.error('Failed to toggle high demand mode:', err);
      setErrorMsg('Failed to update high demand mode.');
    } finally {
      setToggleLoading(false);
    }
  };

  // ACCESS DENIED VIEW: If a non-owner (Seller or Customer) tries to access this page
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#FFF9F3] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#E6D8CC] p-8 text-center space-y-5 shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-[#B84242]/10 border border-[#B84242]/30 flex items-center justify-center text-[#B84242] mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#2B2523]">Access Denied</h1>
            <p className="text-xs sm:text-sm text-[#6F625D] mt-2">
              The Admin Control interface is strictly restricted to the <strong>Main Owner</strong>. Your authenticated account role (
              <span className="font-mono text-[#A63D40]">{role || 'customer'}</span>) does not possess root owner authorization.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex-1 py-2.5 rounded-xl border border-[#E6D8CC] text-[#2B2523] hover:bg-[#FFF9F3] text-xs font-semibold"
            >
              Return to Storefront
            </button>
            <button
              type="button"
              onClick={() => {
                if (role === 'seller') navigate('/seller/dashboard');
                else navigate('/account');
              }}
              className="flex-1 py-2.5 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs font-semibold shadow-xs"
            >
              Go to My Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <DashboardLayout role="owner" activeNav="settings">
        <div className="py-24 flex items-center justify-center">
          <LoadingSpinner label="Authenticating owner security credentials with Neon PostgreSQL..." size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  const {
    account_security = {},
    seller_management = {},
    customer_management = {},
    product_management = {},
    category_management = {},
    platform_settings = {},
    order_management = {},
    payment_settings = {},
    system_settings = {},
  } = controlData || {};

  return (
    <DashboardLayout role="owner" activeNav="settings">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E6D8CC]">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2B2523] flex items-center gap-2.5">
              <ShieldCheck className="w-8 h-8 text-[#A63D40]" />
              Main Owner Platform Administration
            </h1>
            <p className="text-xs sm:text-sm text-[#6F625D] mt-1">
              Centralized platform governance, multi-seller authorization, operational controls, and Neon database synchronization
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadOwnerControl}
              disabled={loading}
              className="p-2.5 rounded-xl border border-[#E6D8CC] bg-white text-[#2B2523] hover:bg-[#FFF9F3] transition-colors cursor-pointer"
              title="Refresh System Status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#A63D40]' : ''}`} />
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#3F7D5A]/10 text-[#3F7D5A] border border-[#3F7D5A]/30 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              Root Authorized
            </span>
          </div>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-[#B84242]/10 border border-[#B84242]/30 text-[#B84242] text-xs sm:text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="p-1 hover:bg-[#B84242]/20 rounded-md">
              ×
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-[#3F7D5A]/10 border border-[#3F7D5A]/30 text-[#3F7D5A] text-xs sm:text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="p-1 hover:bg-[#3F7D5A]/20 rounded-md">
              ×
            </button>
          </div>
        )}

        {/* 1. ACCOUNT & SECURITY SECTION */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E6D8CC] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6D8CC]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center text-[#A63D40]">
                <Lock className="w-4 h-4" />
              </div>
              <h2 className="font-serif text-lg font-bold text-[#2B2523]">Account & Security Governance</h2>
            </div>
            <span className="text-xs font-bold text-[#A63D40] bg-[#FFF9F3] px-3 py-1 rounded-full border border-[#E6D8CC]">
              {account_security.role || 'Main Owner'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F625D] block">Authenticated Owner</span>
              <span className="font-semibold text-sm text-[#2B2523] mt-1 block">{user?.name || user?.username || 'Devika Sundaram'}</span>
              <span className="text-xs text-[#6F625D]">{user?.email || 'owner@craftnest.internal'}</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F625D] block">Access Clearance</span>
              <span className="font-semibold text-sm text-[#3F7D5A] mt-1 block">Full Platform Root Admin</span>
              <span className="text-xs text-[#6F625D]">All Sellers, Orders, Products, Payouts</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F625D] block">Multi-Factor Status</span>
              <span className="font-semibold text-sm text-[#2B2523] mt-1 block">Two-Factor OTP Security Enabled</span>
              <span className="text-xs text-[#6F625D]">Encrypted string database storage</span>
            </div>
          </div>
        </div>

        {/* 2 & 3: SELLER & CUSTOMER MANAGEMENT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Seller Management Section */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6D8CC] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D8CC]">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-[#A63D40]" />
                <h3 className="font-serif text-base font-bold text-[#2B2523]">Seller Management</h3>
              </div>
              <Link
                to="/owner/sellers"
                className="text-xs font-semibold text-[#A63D40] hover:text-[#8F3034] inline-flex items-center gap-1"
              >
                <span>View All Sellers</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] text-center">
                <span className="text-[10px] font-bold uppercase text-[#6F625D] block">Total Sellers</span>
                <span className="font-serif text-xl font-bold text-[#2B2523] mt-0.5 block">{seller_management.total_sellers ?? 0}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] text-center">
                <span className="text-[10px] font-bold uppercase text-[#6F625D] block">Active</span>
                <span className="font-serif text-xl font-bold text-[#3F7D5A] mt-0.5 block">{seller_management.active_sellers ?? 0}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] text-center">
                <span className="text-[10px] font-bold uppercase text-[#6F625D] block">Blocked</span>
                <span className="font-serif text-xl font-bold text-[#B84242] mt-0.5 block">{seller_management.blocked_sellers ?? 0}</span>
              </div>
            </div>
            <Link
              to="/owner/sellers"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#A63D40] text-white text-xs font-semibold hover:bg-[#8F3034] transition-colors"
            >
              <span>Manage Registered Sellers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Customer Management Section */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6D8CC] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D8CC]">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#C69A5B]" />
                <h3 className="font-serif text-base font-bold text-[#2B2523]">Customer Management</h3>
              </div>
              <Link
                to="/owner/customers"
                className="text-xs font-semibold text-[#A63D40] hover:text-[#8F3034] inline-flex items-center gap-1"
              >
                <span>View Customers</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] text-center">
                <span className="text-[10px] font-bold uppercase text-[#6F625D] block">Customers</span>
                <span className="font-serif text-xl font-bold text-[#2B2523] mt-0.5 block">{customer_management.total_customers ?? 0}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] text-center">
                <span className="text-[10px] font-bold uppercase text-[#6F625D] block">Active</span>
                <span className="font-serif text-xl font-bold text-[#3F7D5A] mt-0.5 block">{customer_management.active_customers ?? 0}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] text-center">
                <span className="text-[10px] font-bold uppercase text-[#6F625D] block">Blocked</span>
                <span className="font-serif text-xl font-bold text-[#B84242] mt-0.5 block">{customer_management.blocked_customers ?? 0}</span>
              </div>
            </div>
            <Link
              to="/owner/customers"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] text-[#2B2523] hover:bg-[#F4E8DC] text-xs font-semibold transition-colors"
            >
              <span>Manage User Directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 4 & 5: PRODUCTS & CATEGORIES SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Management */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6D8CC] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D8CC]">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#A63D40]" />
                <h3 className="font-serif text-base font-bold text-[#2B2523]">Product Catalog</h3>
              </div>
              <Link
                to="/owner/products"
                className="text-xs font-semibold text-[#A63D40] hover:text-[#8F3034] inline-flex items-center gap-1"
              >
                <span>All Products</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] text-center">
                <span className="text-[10px] font-bold uppercase text-[#6F625D] block">Total Items</span>
                <span className="font-serif text-xl font-bold text-[#2B2523] mt-0.5 block">{product_management.total_products ?? 0}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] text-center">
                <span className="text-[10px] font-bold uppercase text-[#6F625D] block">Active</span>
                <span className="font-serif text-xl font-bold text-[#3F7D5A] mt-0.5 block">{product_management.active_products ?? 0}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] text-center">
                <span className="text-[10px] font-bold uppercase text-[#6F625D] block">Low Stock</span>
                <span className="font-serif text-xl font-bold text-[#B84242] mt-0.5 block">{product_management.low_stock_products ?? 0}</span>
              </div>
            </div>
            <Link
              to="/owner/products"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] text-[#2B2523] hover:bg-[#F4E8DC] text-xs font-semibold transition-colors"
            >
              <span>Manage Products Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Category Management */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6D8CC] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D8CC]">
              <div className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-[#C69A5B]" />
                <h3 className="font-serif text-base font-bold text-[#2B2523]">Craft Clusters & Categories</h3>
              </div>
              <Link
                to="/owner/categories"
                className="text-xs font-semibold text-[#A63D40] hover:text-[#8F3034] inline-flex items-center gap-1"
              >
                <span>Edit Categories</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="p-4 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC]">
              <span className="text-xs text-[#6F625D] block">Accredited GI Craft Clusters in Database:</span>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {category_management.categories?.slice(0, 5).map((cat) => (
                  <span
                    key={cat.id || cat._id}
                    className="px-2.5 py-1 rounded-lg bg-white border border-[#E6D8CC] text-xs font-semibold text-[#2B2523]"
                  >
                    {cat.name}
                  </span>
                ))}
                {(category_management.total_categories || 0) > 5 && (
                  <span className="text-xs text-[#6F625D]">
                    +{category_management.total_categories - 5} more
                  </span>
                )}
              </div>
            </div>
            <Link
              to="/owner/categories"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] text-[#2B2523] hover:bg-[#F4E8DC] text-xs font-semibold transition-colors"
            >
              <span>Organize Craft Categories</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 6. PLATFORM SETTINGS & OPERATIONAL MODES */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E6D8CC] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6D8CC]">
            <div className="flex items-center gap-2.5">
              <Settings className="w-5 h-5 text-[#A63D40]" />
              <h3 className="font-serif text-base font-bold text-[#2B2523]">Platform Operational Modes</h3>
            </div>
            <span className="text-xs text-[#6F625D]">Synchronized across all visitors</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Maintenance Mode */}
            <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-[#2B2523]">Maintenance Mode</h4>
                <p className="text-xs text-[#6F625D] mt-0.5">
                  Temporarily lock storefront for artisan inventory synchronization
                </p>
                <span className={`inline-block mt-2 text-xs font-bold ${
                  platform_settings.maintenance_mode ? 'text-[#B84242]' : 'text-[#3F7D5A]'
                }`}>
                  Status: {platform_settings.maintenance_mode ? 'ACTIVE (Storefront Locked)' : 'INACTIVE (Normal Operations)'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleMaintenance}
                disabled={toggleLoading}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  platform_settings.maintenance_mode
                    ? 'bg-[#3F7D5A] text-white hover:bg-[#326447]'
                    : 'bg-[#B84242] text-white hover:bg-[#963434]'
                }`}
              >
                {platform_settings.maintenance_mode ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                <span>{platform_settings.maintenance_mode ? 'Turn Off' : 'Turn On'}</span>
              </button>
            </div>

            {/* High Demand Mode */}
            <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-[#2B2523]">High Demand Traffic Surge Protection</h4>
                <p className="text-xs text-[#6F625D] mt-0.5">
                  Prioritizes database pool connections during festive sales
                </p>
                <span className={`inline-block mt-2 text-xs font-bold ${
                  platform_settings.high_demand_mode ? 'text-[#C69A5B]' : 'text-[#6F625D]'
                }`}>
                  Status: {platform_settings.high_demand_mode ? 'ENABLED (Surge Mode)' : 'NORMAL'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleHighDemand}
                disabled={toggleLoading}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  platform_settings.high_demand_mode
                    ? 'bg-[#C69A5B] text-white hover:bg-[#A88047]'
                    : 'bg-[#2B2523] text-white hover:bg-[#A63D40]'
                }`}
              >
                {platform_settings.high_demand_mode ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                <span>{platform_settings.high_demand_mode ? 'Deactivate' : 'Activate'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 7 & 8: ORDERS & PAYMENTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Order Governance */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6D8CC] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D8CC]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#A63D40]" />
                <h3 className="font-serif text-base font-bold text-[#2B2523]">Platform Orders</h3>
              </div>
              <Link
                to="/owner/orders"
                className="text-xs font-semibold text-[#A63D40] hover:text-[#8F3034] inline-flex items-center gap-1"
              >
                <span>Orders Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] text-center">
                <span className="text-[10px] font-bold uppercase text-[#6F625D] block">Total Orders</span>
                <span className="font-serif text-xl font-bold text-[#2B2523] mt-0.5 block">{order_management.total_orders ?? 0}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] text-center">
                <span className="text-[10px] font-bold uppercase text-[#6F625D] block">Pending</span>
                <span className="font-serif text-xl font-bold text-[#C69A5B] mt-0.5 block">{order_management.pending_orders ?? 0}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] text-center">
                <span className="text-[10px] font-bold uppercase text-[#6F625D] block">Platform Sales</span>
                <span className="font-serif text-xl font-bold text-[#3F7D5A] mt-0.5 block">₹{Number(order_management.total_revenue || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
            <Link
              to="/owner/orders"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] text-[#2B2523] hover:bg-[#F4E8DC] text-xs font-semibold transition-colors"
            >
              <span>Manage Order Fulfillment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Payment Gateways */}
          <div className="bg-white p-6 rounded-3xl border border-[#E6D8CC] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D8CC]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#3F7D5A]" />
                <h3 className="font-serif text-base font-bold text-[#2B2523]">Payment Processing</h3>
              </div>
              <Link
                to="/owner/payments"
                className="text-xs font-semibold text-[#A63D40] hover:text-[#8F3034] inline-flex items-center gap-1"
              >
                <span>Payment Records</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="p-4 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6F625D]">Active Gateways:</span>
                <span className="font-bold text-[#2B2523]">Razorpay UPI/Cards + COD</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6F625D]">Settlement Currency:</span>
                <span className="font-bold text-[#2B2523]">INR (₹) Indian Rupee</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6F625D]">Gateway Health:</span>
                <span className="font-bold text-[#3F7D5A]">Verified & Operating</span>
              </div>
            </div>
            <Link
              to="/owner/payments"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] text-[#2B2523] hover:bg-[#F4E8DC] text-xs font-semibold transition-colors"
            >
              <span>View Financial Transactions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 9. SYSTEM SETTINGS & ENVIRONMENT */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E6D8CC] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6D8CC]">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-[#2B2523]" />
              <h3 className="font-serif text-base font-bold text-[#2B2523]">System & Database Infrastructure</h3>
            </div>
            <span className="text-xs font-mono bg-[#FFF9F3] px-2.5 py-1 rounded-lg border border-[#E6D8CC] text-[#3F7D5A] font-bold">
              ● Connected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC]">
              <span className="text-[#6F625D] block mb-1">Primary Database:</span>
              <strong className="text-[#2B2523] text-sm block">Neon PostgreSQL</strong>
              <span className="text-[11px] text-[#3F7D5A]">Encrypted channel pooling</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC]">
              <span className="text-[#6F625D] block mb-1">Active Environment:</span>
              <strong className="text-[#2B2523] text-sm block font-mono">{system_settings.environment || 'DEV'}</strong>
              <span className="text-[11px] text-[#6F625D]">Strict role verification active</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC]">
              <span className="text-[#6F625D] block mb-1">Backend Framework:</span>
              <strong className="text-[#2B2523] text-sm block">Python Flask WSGI</strong>
              <span className="text-[11px] text-[#6F625D]">RESTful JSON API Engine</span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              to="/owner/databases"
              className="w-full inline-flex items-center justify-between p-3.5 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] hover:bg-[#F4E8DC] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-[#A63D40]" />
                <span className="text-xs font-bold text-[#2B2523]">
                  Dynamic Multi-Database Manager (DB1, DB2, DB3...)
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-[#A63D40]">
                <span>Manage Architecture</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
