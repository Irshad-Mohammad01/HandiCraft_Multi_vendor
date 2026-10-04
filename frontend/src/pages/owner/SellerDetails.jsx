import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Store,
  ArrowLeft,
  Package,
  ShoppingBag,
  Users,
  DollarSign,
  Calendar,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Power,
  PowerOff,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Tag,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { adminApi } from '../../api/admin';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatPrice } from '../../utils/priceFormatter';

export default function SellerDetails() {
  const { sellerId, id } = useParams();
  const activeSellerId = sellerId || id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('products'); // products | orders | customers
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (activeSellerId) {
      loadSellerDetails();
    }
  }, [activeSellerId]);

  const loadSellerDetails = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await adminApi.getSellerDetails(activeSellerId);
      setData(res);
    } catch (err) {
      console.error('Failed to load seller details:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to retrieve seller details from server.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!data?.seller) return;
    const newBlocked = !data.seller.is_blocked;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await adminApi.toggleSellerStatus(activeSellerId, newBlocked);
      setSuccessMsg(`Seller status updated to ${newBlocked ? 'Inactive/Blocked' : 'Active'}.`);
      await loadSellerDetails();
    } catch (err) {
      console.error('Failed to update status:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update seller status.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="owner" activeNav="sellers">
        <div className="py-24 flex items-center justify-center">
          <LoadingSpinner label="Loading seller details from Neon PostgreSQL..." size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (errorMsg && !data) {
    return (
      <DashboardLayout role="owner" activeNav="sellers">
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-[#E6D8CC] text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-[#B84242] mx-auto" />
            <h2 className="font-serif text-xl font-bold text-[#2B2523]">{errorMsg}</h2>
            <button
              onClick={() => navigate('/owner/sellers')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#A63D40] text-white text-xs font-semibold hover:bg-[#8F3034]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Sellers List</span>
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { seller, products = [], orders = [], customers = [], stats = {} } = data || {};

  return (
    <DashboardLayout role="owner" activeNav="sellers">
      <div className="space-y-6">
        {/* Breadcrumbs Navigation */}
        <div className="flex items-center gap-2 text-xs text-[#6F625D]">
          <Link to="/owner/sellers" className="hover:text-[#A63D40] transition-colors flex items-center gap-1 font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Sellers Data</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-[#E6D8CC]" />
          <span className="font-medium text-[#2B2523]">Seller #{seller?.id} Details</span>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-[#B84242]/10 border border-[#B84242]/30 text-[#B84242] text-xs sm:text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-[#3F7D5A]/10 border border-[#3F7D5A]/30 text-[#3F7D5A] text-xs sm:text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Seller Profile Header Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E6D8CC] shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E6D8CC]">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#FFF9F3] border-2 border-[#E6D8CC] flex items-center justify-center text-[#A63D40] font-serif text-2xl font-bold shrink-0">
                {(seller?.name || 'S').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2B2523]">
                    {seller?.name}
                  </h1>
                  {seller?.is_blocked ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#B84242]/10 text-[#B84242] border border-[#B84242]/20 text-xs font-bold">
                      <XCircle className="w-3.5 h-3.5" />
                      Blocked / Inactive
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#3F7D5A]/10 text-[#3F7D5A] border border-[#3F7D5A]/20 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Active Artisan
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-[#A63D40] mt-0.5">
                  {seller?.business_name || 'Traditional Craft Guild'}
                </p>
                <div className="flex items-center gap-4 text-xs text-[#6F625D] mt-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-[#C69A5B]" />
                    Seller ID: <strong className="text-[#2B2523] font-mono">#{seller?.id}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-[#6F625D]" />
                    {seller?.email}
                  </span>
                  {seller?.mobile && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#6F625D]" />
                      {seller?.mobile}
                    </span>
                  )}
                  {seller?.registration_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#6F625D]" />
                      Joined: {seller.registration_date.slice(0, 10)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={actionLoading}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  seller?.is_blocked
                    ? 'border-[#3F7D5A]/30 bg-[#3F7D5A]/10 text-[#3F7D5A] hover:bg-[#3F7D5A]/20'
                    : 'border-[#B84242]/30 bg-[#B84242]/10 text-[#B84242] hover:bg-[#B84242]/20'
                }`}
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : seller?.is_blocked ? (
                  <Power className="w-4 h-4" />
                ) : (
                  <PowerOff className="w-4 h-4" />
                )}
                <span>{seller?.is_blocked ? 'Activate Artisan' : 'Deactivate Account'}</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F625D] block">
                Products
              </span>
              <span className="font-serif text-2xl font-bold text-[#A63D40] mt-1 block">
                {stats.total_products ?? products.length}
              </span>
              <span className="text-[10px] text-[#6F625D]">{stats.active_products ?? 0} active in store</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F625D] block">
                Orders
              </span>
              <span className="font-serif text-2xl font-bold text-[#C69A5B] mt-1 block">
                {stats.total_orders ?? orders.length}
              </span>
              <span className="text-[10px] text-[#6F625D]">Relevant order items</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F625D] block">
                Artisan Sales
              </span>
              <span className="font-serif text-2xl font-bold text-[#3F7D5A] mt-1 block">
                ₹{Number(stats.total_revenue || 0).toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-[#6F625D]">Earned from items</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F625D] block">
                Patrons
              </span>
              <span className="font-serif text-2xl font-bold text-[#2B2523] mt-1 block">
                {stats.total_customers ?? customers.length}
              </span>
              <span className="text-[10px] text-[#6F625D]">Unique buyers</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC] col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F625D] block">
                Permissions
              </span>
              <span className="font-serif text-sm font-bold text-[#2B2523] mt-2 block flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-[#3F7D5A]" />
                Multi-Seller
              </span>
              <span className="text-[10px] text-[#6F625D]">Scoped to guild data</span>
            </div>
          </div>
        </div>

        {/* Section Tabs: Products | Orders | Customers */}
        <div className="flex items-center gap-2 border-b border-[#E6D8CC] pb-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer border-b-2 ${
              activeTab === 'products'
                ? 'border-[#A63D40] text-[#A63D40] bg-white'
                : 'border-transparent text-[#6F625D] hover:text-[#2B2523]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Seller Products ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer border-b-2 ${
              activeTab === 'orders'
                ? 'border-[#A63D40] text-[#A63D40] bg-white'
                : 'border-transparent text-[#6F625D] hover:text-[#2B2523]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Seller Orders ({orders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer border-b-2 ${
              activeTab === 'customers'
                ? 'border-[#A63D40] text-[#A63D40] bg-white'
                : 'border-transparent text-[#6F625D] hover:text-[#2B2523]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Seller Patrons / Customers ({customers.length})</span>
          </button>
        </div>

        {/* TAB 1: SELLER PRODUCTS (Filtered strictly to this seller by backend) */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-2xl border border-[#E6D8CC] overflow-hidden shadow-xs">
            {products.length === 0 ? (
              <div className="py-16 px-4 text-center space-y-2">
                <Package className="w-10 h-10 text-[#C69A5B] mx-auto mb-1" />
                <h3 className="font-serif text-base font-bold text-[#2B2523]">No products published by this seller yet.</h3>
                <p className="text-xs text-[#6F625D]">When this artisan adds handcrafted items, they will appear here filtered by seller ownership.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#FFF9F3] border-b border-[#E6D8CC] text-[#2B2523] font-semibold">
                      <th className="py-3 px-4">Item</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4 text-center">Stock</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Storefront Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6D8CC]/70">
                    {products.map((p) => {
                      const image = p.images?.[0] || 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=300&q=80';
                      return (
                        <tr key={p.id || p._id} className="hover:bg-[#FFF9F3]/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={image}
                                alt={p.name}
                                className="w-12 h-12 rounded-xl object-cover border border-[#E6D8CC] bg-[#FFF9F3]"
                                onError={(e) => {
                                  e.target.src = 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=300&q=80';
                                }}
                              />
                              <div>
                                <Link
                                  to={`/products/${p.id || p._id}`}
                                  className="font-semibold text-[#2B2523] hover:text-[#A63D40] transition-colors line-clamp-1"
                                >
                                  {p.name}
                                </Link>
                                <span className="text-[11px] text-[#6F625D] font-mono">
                                  ID: #{p.id || p._id}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-[#6F625D]">
                            {p.category_name || p.category?.name || 'Handicrafts'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[#A63D40]">
                            {formatPrice(p.price)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              (p.stock || 0) > 0 ? 'bg-[#3F7D5A]/10 text-[#3F7D5A]' : 'bg-[#B84242]/10 text-[#B84242]'
                            }`}>
                              {p.stock ?? 0} in stock
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex px-2 py-0.5 rounded-full bg-[#3F7D5A]/10 text-[#3F7D5A] font-semibold text-[11px] capitalize">
                              {p.status || 'Active'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {/* Product click navigates to /products/:id */}
                            <Link
                              to={`/products/${p.id || p._id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E6D8CC] bg-white text-[#2B2523] hover:bg-[#A63D40] hover:text-white transition-colors text-xs font-semibold"
                            >
                              <span>View Item</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SELLER ORDERS (Only orders associated with this seller's products) */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl border border-[#E6D8CC] overflow-hidden shadow-xs">
            {orders.length === 0 ? (
              <div className="py-16 px-4 text-center space-y-2">
                <ShoppingBag className="w-10 h-10 text-[#C69A5B] mx-auto mb-1" />
                <h3 className="font-serif text-base font-bold text-[#2B2523]">No orders placed for this seller's products yet.</h3>
                <p className="text-xs text-[#6F625D]">Customer orders containing items from this artisan will be listed here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#FFF9F3] border-b border-[#E6D8CC] text-[#2B2523] font-semibold">
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Seller Items in Order</th>
                      <th className="py-3 px-4 text-right">Seller Portion Total</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6D8CC]/70">
                    {orders.map((o) => (
                      <tr key={o.id || o.order_id} className="hover:bg-[#FFF9F3]/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#A63D40]">
                          {o.order_id}
                        </td>
                        <td className="py-3.5 px-4 text-[#6F625D]">
                          {o.created_at ? o.created_at.slice(0, 10) : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-[#2B2523] block">{o.customer_name}</span>
                          <span className="text-[11px] text-[#6F625D]">{o.customer_email}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            {o.items?.map((it, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs">
                                <span className="font-bold text-[#2B2523]">{it.quantity}x</span>
                                <span className="text-[#6F625D] line-clamp-1">{it.name}</span>
                                <span className="text-[#A63D40] font-mono">({formatPrice(it.price)})</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-[#3F7D5A]">
                          ₹{Number(o.seller_total_amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full bg-[#C69A5B]/10 text-[#C69A5B] font-bold text-[11px]">
                            {o.order_status || o.status || 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SELLER CUSTOMERS (Customers who purchased products from this seller) */}
        {activeTab === 'customers' && (
          <div className="bg-white rounded-2xl border border-[#E6D8CC] overflow-hidden shadow-xs">
            {customers.length === 0 ? (
              <div className="py-16 px-4 text-center space-y-2">
                <Users className="w-10 h-10 text-[#C69A5B] mx-auto mb-1" />
                <h3 className="font-serif text-base font-bold text-[#2B2523]">No customers have purchased from this seller yet.</h3>
                <p className="text-xs text-[#6F625D]">Patrons who place orders for this artisan's creations will be recorded here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#FFF9F3] border-b border-[#E6D8CC] text-[#2B2523] font-semibold">
                      <th className="py-3 px-4">Customer ID</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4 text-center">Orders with Seller</th>
                      <th className="py-3 px-4 text-right">Total Spent with Seller</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6D8CC]/70">
                    {customers.map((c) => (
                      <tr key={c.id} className="hover:bg-[#FFF9F3]/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#A63D40]">
                          #{c.id}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#2B2523]">
                          {c.name}
                        </td>
                        <td className="py-3.5 px-4 text-[#6F625D]">
                          {c.email}
                        </td>
                        <td className="py-3.5 px-4 text-[#6F625D]">
                          {c.mobile || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full bg-[#FFF9F3] border border-[#E6D8CC] font-bold text-xs">
                            {c.orders_count}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-[#3F7D5A]">
                          ₹{Number(c.total_spent || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
