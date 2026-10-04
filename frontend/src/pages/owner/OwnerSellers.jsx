import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  Plus,
  Search,
  Eye,
  Settings,
  Power,
  PowerOff,
  AlertCircle,
  Filter,
  RefreshCw,
  ShoppingBag,
  Package,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react';
import { adminApi } from '../../api/admin';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function OwnerSellers() {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | inactive
  const [productFilter, setProductFilter] = useState('all'); // all | with_products | zero_products
  const [orderFilter, setOrderFilter] = useState('all'); // all | with_orders | zero_orders

  // Create Seller Modal
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    mobile: '',
  });

  // Action Loading State (e.g. toggling status)
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    loadSellers();
  }, []);

  const loadSellers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await adminApi.getSellers();
      setSellers(Array.isArray(data) ? data : data?.sellers || []);
    } catch (err) {
      console.error('Failed to load sellers from database:', err);
      setErrorMsg('Failed to load seller accounts from the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (seller) => {
    const newBlockedState = !seller.is_blocked;
    setActionLoadingId(seller.id);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await adminApi.toggleSellerStatus(seller.id, newBlockedState);
      setSuccessMsg(`Seller #${seller.id} (${seller.name}) status updated to ${newBlockedState ? 'Inactive/Blocked' : 'Active'}.`);
      await loadSellers();
    } catch (err) {
      console.error('Failed to update seller status:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update seller status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreateSeller = async (e) => {
    e.preventDefault();
    setSaving(true);
    setModalError('');
    try {
      await adminApi.createSeller(formData);
      setShowModal(false);
      setFormData({ name: '', email: '', password: '', mobile: '' });
      setSuccessMsg('New artisan seller onboarded successfully.');
      await loadSellers();
    } catch (err) {
      console.error('Error creating seller:', err);
      setModalError(err.response?.data?.message || 'Failed to onboard artisan seller.');
    } finally {
      setSaving(false);
    }
  };

  // Filter and search computation on real database sellers
  const filteredSellers = sellers.filter((s) => {
    // 1. Search Query (Seller Name, Seller ID, Email, Business Name)
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = String(s.name || '').toLowerCase().includes(q);
      const matchEmail = String(s.email || '').toLowerCase().includes(q);
      const matchId = String(s.id || '').includes(q);
      const matchBiz = String(s.business_name || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchId && !matchBiz) return false;
    }

    // 2. Status Filter
    if (statusFilter === 'active' && s.is_blocked) return false;
    if (statusFilter === 'inactive' && !s.is_blocked) return false;

    // 3. Product Count Filter
    if (productFilter === 'with_products' && (s.products_count || 0) === 0) return false;
    if (productFilter === 'zero_products' && (s.products_count || 0) > 0) return false;

    // 4. Order Count Filter
    if (orderFilter === 'with_orders' && (s.orders_count || 0) === 0) return false;
    if (orderFilter === 'zero_orders' && (s.orders_count || 0) > 0) return false;

    return true;
  });

  return (
    <DashboardLayout role="owner" activeNav="sellers">
      <div className="space-y-6">
        {/* Page Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E6D8CC]">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2B2523] flex items-center gap-2">
              <Store className="w-7 h-7 text-[#A63D40]" />
              Artisan & Seller Management
            </h1>
            <p className="text-xs sm:text-sm text-[#6F625D] mt-1">
              Real-time database records of registered craft guild accounts, product catalogs, and fulfilled orders
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadSellers}
              disabled={loading}
              className="p-2.5 rounded-xl border border-[#E6D8CC] bg-white text-[#2B2523] hover:bg-[#FFF9F3] transition-colors cursor-pointer"
              title="Refresh Sellers"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#A63D40]' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                setModalError('');
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard New Artisan</span>
            </button>
          </div>
        </div>

        {/* Alert Notifications */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-[#B84242]/10 border border-[#B84242]/30 text-[#B84242] text-xs sm:text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="p-1 hover:bg-[#B84242]/20 rounded-md">
              <X className="w-4 h-4" />
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
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search & Filters Controls Row */}
        <div className="bg-white p-4 rounded-2xl border border-[#E6D8CC] shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#6F625D] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search sellers by name, ID, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl text-xs sm:text-sm text-[#2B2523] placeholder-[#6F625D]/70 focus:bg-white focus:border-[#A63D40] outline-none transition-colors"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#6F625D] shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full py-2 px-3 bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl text-xs sm:text-sm text-[#2B2523] focus:bg-white focus:border-[#A63D40] outline-none transition-colors cursor-pointer"
              >
                <option value="all">Status: All</option>
                <option value="active">Status: Active</option>
                <option value="inactive">Status: Inactive / Blocked</option>
              </select>
            </div>

            {/* Products Filter */}
            <div>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="w-full py-2 px-3 bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl text-xs sm:text-sm text-[#2B2523] focus:bg-white focus:border-[#A63D40] outline-none transition-colors cursor-pointer"
              >
                <option value="all">Products: All</option>
                <option value="with_products">Has Published Products</option>
                <option value="zero_products">No Products Yet (0)</option>
              </select>
            </div>

            {/* Orders Filter */}
            <div>
              <select
                value={orderFilter}
                onChange={(e) => setOrderFilter(e.target.value)}
                className="w-full py-2 px-3 bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl text-xs sm:text-sm text-[#2B2523] focus:bg-white focus:border-[#A63D40] outline-none transition-colors cursor-pointer"
              >
                <option value="all">Orders: All</option>
                <option value="with_orders">Has Relevant Orders</option>
                <option value="zero_orders">No Orders Yet (0)</option>
              </select>
            </div>
          </div>

          {/* Results Summary Count */}
          <div className="flex items-center justify-between text-xs text-[#6F625D] pt-2 border-t border-[#E6D8CC]/50">
            <span>
              Showing <strong className="text-[#2B2523]">{filteredSellers.length}</strong> of{' '}
              <strong className="text-[#2B2523]">{sellers.length}</strong> total registered sellers
            </span>
            {(search || statusFilter !== 'all' || productFilter !== 'all' || orderFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setProductFilter('all');
                  setOrderFilter('all');
                }}
                className="text-[#A63D40] hover:underline font-semibold cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Sellers Data Table */}
        <div className="bg-white rounded-2xl border border-[#E6D8CC] overflow-hidden shadow-xs">
          {loading ? (
            <div className="py-20 flex items-center justify-center">
              <LoadingSpinner label="Querying Neon PostgreSQL seller database..." size="md" />
            </div>
          ) : sellers.length === 0 ? (
            /* EXACT REQUIREMENT: If 0 sellers show "No sellers registered yet." Do NOT show demo sellers */
            <div className="py-16 px-4 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center text-[#6F625D] mx-auto">
                <Store className="w-7 h-7" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#2B2523]">No sellers registered yet.</h3>
              <p className="text-xs text-[#6F625D] max-w-md mx-auto">
                There are currently no artisan seller accounts registered in the database. Use the Onboard button to add an accredited seller.
              </p>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#A63D40] text-white text-xs font-semibold hover:bg-[#8F3034] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Onboard First Artisan</span>
              </button>
            </div>
          ) : filteredSellers.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-2">
              <p className="font-serif text-base font-bold text-[#2B2523]">No sellers match your active filters.</p>
              <p className="text-xs text-[#6F625D]">Try adjusting your search criteria or resetting filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#FFF9F3] border-b border-[#E6D8CC] text-[#2B2523] font-semibold">
                    <th className="py-3.5 px-4">Seller ID</th>
                    <th className="py-3.5 px-4">Seller</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Mobile</th>
                    <th className="py-3.5 px-4 text-center">Products</th>
                    <th className="py-3.5 px-4 text-center">Orders</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6D8CC]/70">
                  {filteredSellers.map((seller) => (
                    <tr
                      key={seller.id}
                      className="hover:bg-[#FFF9F3]/60 transition-colors group"
                    >
                      {/* Seller ID */}
                      <td className="py-4 px-4 font-mono font-bold text-[#A63D40]">
                        #{seller.id}
                      </td>

                      {/* Seller Name & Business Entity */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center text-[#A63D40] font-bold text-xs shrink-0">
                            {(seller.name || 'S').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => navigate(`/owner/sellers/${seller.id}`)}
                              className="font-semibold text-[#2B2523] hover:text-[#A63D40] transition-colors text-left cursor-pointer"
                            >
                              {seller.name}
                            </button>
                            <span className="block text-[11px] text-[#6F625D]">
                              {seller.business_name || 'Artisan Guild'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-4 px-4 text-[#6F625D]">
                        {seller.email}
                      </td>

                      {/* Mobile */}
                      <td className="py-4 px-4 text-[#6F625D]">
                        {seller.mobile || seller.phone || 'N/A'}
                      </td>

                      {/* Products Count */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFF9F3] border border-[#E6D8CC] font-bold text-xs text-[#2B2523]">
                          <Package className="w-3 h-3 text-[#A63D40]" />
                          {seller.products_count ?? 0}
                        </span>
                      </td>

                      {/* Orders Count */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFF9F3] border border-[#E6D8CC] font-bold text-xs text-[#2B2523]">
                          <ShoppingBag className="w-3 h-3 text-[#C69A5B]" />
                          {seller.orders_count ?? 0}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        {seller.is_blocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#B84242]/10 text-[#B84242] border border-[#B84242]/20 text-[11px] font-bold">
                            <XCircle className="w-3 h-3" />
                            Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#3F7D5A]/10 text-[#3F7D5A] border border-[#3F7D5A]/20 text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Seller Profile */}
                          <button
                            type="button"
                            onClick={() => navigate(`/owner/sellers/${seller.id}`)}
                            className="p-1.5 rounded-lg border border-[#E6D8CC] text-[#2B2523] hover:text-[#A63D40] hover:bg-white transition-colors cursor-pointer"
                            title="View Seller Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Manage Seller */}
                          <button
                            type="button"
                            onClick={() => navigate(`/owner/sellers/${seller.id}`)}
                            className="p-1.5 rounded-lg border border-[#E6D8CC] text-[#2B2523] hover:text-[#A63D40] hover:bg-white transition-colors cursor-pointer"
                            title="Manage Seller"
                          >
                            <Settings className="w-4 h-4" />
                          </button>

                          {/* Deactivate / Activate Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(seller)}
                            disabled={actionLoadingId === seller.id}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              seller.is_blocked
                                ? 'border-[#3F7D5A]/30 text-[#3F7D5A] hover:bg-[#3F7D5A]/10'
                                : 'border-[#B84242]/30 text-[#B84242] hover:bg-[#B84242]/10'
                            }`}
                            title={seller.is_blocked ? 'Activate Seller' : 'Deactivate / Block Seller'}
                          >
                            {actionLoadingId === seller.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : seller.is_blocked ? (
                              <Power className="w-4 h-4" />
                            ) : (
                              <PowerOff className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Onboard New Artisan Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#E6D8CC] max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D8CC]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center text-[#A63D40]">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#2B2523]">Onboard New Master Artisan</h3>
                  <p className="text-xs text-[#6F625D]">Register accredited artisan guild into Neon PostgreSQL</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg text-[#6F625D] hover:bg-[#FFF9F3] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3.5 rounded-xl bg-[#B84242]/10 border border-[#B84242]/30 text-[#B84242] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSeller} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2B2523] uppercase tracking-wider mb-1.5">
                  Artisan Guild / Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar Jaipur Pottery Guild"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl text-xs sm:text-sm text-[#2B2523] focus:bg-white focus:border-[#A63D40] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2523] uppercase tracking-wider mb-1.5">
                  Artisan Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="artisan@guild.craftnest.internal"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl text-xs sm:text-sm text-[#2B2523] focus:bg-white focus:border-[#A63D40] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2523] uppercase tracking-wider mb-1.5">
                  Mobile Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="+91 98111 22233"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl text-xs sm:text-sm text-[#2B2523] focus:bg-white focus:border-[#A63D40] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B2523] uppercase tracking-wider mb-1.5">
                  Temporary Secure Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl text-xs sm:text-sm text-[#2B2523] focus:bg-white focus:border-[#A63D40] outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E6D8CC]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-[#E6D8CC] text-[#6F625D] hover:bg-[#FFF9F3] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{saving ? 'Registering...' : 'Create Seller Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
