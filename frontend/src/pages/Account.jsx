import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation, useParams, Link } from 'react-router-dom';
import {
  User,
  MapPin,
  Package,
  Heart,
  Settings,
  Star,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Phone,
  Mail,
  Home,
  ShoppingBag,
  ChevronRight,
  RotateCcw,
  Truck,
  Eye,
  Download,
  FileText,
  Headphones,
  MessageSquare,
  Send,
  MessageCircle,
  Clock,
  Sparkles,
  ArrowLeft,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { ordersApi } from '../api/orders';
import { supportApi } from '../api/support';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import InvoiceModal from '../components/common/InvoiceModal';

export default function Account({ defaultTab }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { ticketId: routeTicketId } = useParams();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, loading: authLoading, updateUser } = useAuth();
  
  // Safe extraction of wishlist from context
  const wishlistCtx = useWishlist() || {};
  const wishlist = Array.isArray(wishlistCtx.wishlist)
    ? wishlistCtx.wishlist
    : Array.isArray(wishlistCtx.items)
    ? wishlistCtx.items
    : [];
  const removeFromWishlist = wishlistCtx.removeFromWishlist || (() => {});
  const { addToCart } = useCart();

  const getInitialTab = useCallback(() => {
    if (defaultTab) return defaultTab;
    const path = location.pathname.replace('/account/', '').replace('/account', '').trim();
    if (path.startsWith('support')) return 'support';
    if (['profile', 'orders', 'support', 'wishlist', 'addresses', 'reviews', 'settings'].includes(path)) {
      return path;
    }
    return searchParams.get('tab') || 'profile';
  }, [defaultTab, location.pathname, searchParams]);

  const [currentTab, setCurrentTab] = useState(getInitialTab);

  useEffect(() => {
    setCurrentTab(getInitialTab());
  }, [getInitialTab]);

  // Profile Form state initialized with user data safely
  const [profileData, setProfileData] = useState({
    username: user?.name || user?.username || '',
    email: user?.email || '',
    phone: user?.phone || user?.mobile || '',
  });

  // Keep profile form synced with authenticated user state
  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.name || user.username || '',
        email: user.email || '',
        phone: user.phone || user.mobile || '',
      });
    }
  }, [user]);

  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password / Settings change state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Addresses state
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [addressesError, setAddressesError] = useState('');
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    street: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    phone: '',
    is_default: false,
  });

  // Orders state
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [loadingInvoiceId, setLoadingInvoiceId] = useState(null);

  const handleViewInvoice = async (ord) => {
    const ordRef = ord.order_id || ord.id || ord._id;
    try {
      setLoadingInvoiceId(ordRef);
      const res = await ordersApi.getInvoice(ordRef);
      if (res && res.invoice) {
        setSelectedInvoice(res.invoice);
        setIsInvoiceModalOpen(true);
      } else {
        alert('Invoice details not found.');
      }
    } catch (err) {
      console.error('Failed to view invoice:', err);
      alert(err.response?.data?.message || 'Could not load invoice.');
    } finally {
      setLoadingInvoiceId(null);
    }
  };

  const handleDownloadInvoice = async (ord) => {
    const ordRef = ord.order_id || ord.id || ord._id;
    try {
      setLoadingInvoiceId(ordRef);
      await ordersApi.downloadInvoicePdf(ordRef, ord.invoice_number);
    } catch (err) {
      console.error('Failed to download invoice:', err);
      alert(err.response?.data?.message || 'Could not download invoice PDF.');
    } finally {
      setLoadingInvoiceId(null);
    }
  };

  const loadAddresses = useCallback(async () => {
    setLoadingAddresses(true);
    setAddressesError('');
    try {
      const res = await authApi.getAddresses();
      let addrList = [];
      if (Array.isArray(res)) {
        addrList = res;
      } else if (res && Array.isArray(res.addresses)) {
        addrList = res.addresses;
      }
      setAddresses(addrList);
    } catch (err) {
      console.error('Failed to load addresses:', err);
      setAddressesError(err.response?.data?.message || 'Could not load delivery addresses.');
      setAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    setOrdersError('');
    try {
      const res = await ordersApi.getAll();
      let list = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (res && Array.isArray(res.orders)) {
        list = res.orders;
      } else if (res && Array.isArray(res.items)) {
        list = res.items;
      }

      if (Array.isArray(list)) {
        list.sort(
          (a, b) =>
            new Date(b.created_at || b.order_date || 0) -
            new Date(a.created_at || a.order_date || 0)
        );
      } else {
        list = [];
      }
      setOrders(list);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setOrdersError(err.response?.data?.message || 'Could not load order history.');
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // Support Tickets State
  const [supportTickets, setSupportTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [supportError, setSupportError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loadingTicketDetails, setLoadingTicketDetails] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);
  const [followUpSuccess, setFollowUpSuccess] = useState('');
  const [followUpError, setFollowUpError] = useState('');
  const [supportFilter, setSupportFilter] = useState('all');

  const loadSupportTickets = useCallback(async () => {
    setLoadingTickets(true);
    setSupportError('');
    try {
      const data = await supportApi.getMyTickets();
      const list = Array.isArray(data) ? data : data.items || [];
      setSupportTickets(list);
      return list;
    } catch (err) {
      console.error('Failed to load customer support tickets:', err);
      setSupportError('Could not load your support tickets.');
      return [];
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  const loadTicketDetails = useCallback(async (ticketId) => {
    if (!ticketId) return;
    setLoadingTicketDetails(true);
    setFollowUpError('');
    setFollowUpSuccess('');
    try {
      const data = await supportApi.getTicketDetails(ticketId);
      setSelectedTicket(data);
    } catch (err) {
      console.error('Failed to load support ticket details:', err);
      setFollowUpError('Unable to load ticket conversation.');
    } finally {
      setLoadingTicketDetails(false);
    }
  }, []);

  const handleSendFollowUp = async (e) => {
    e.preventDefault();
    if (!followUpMessage.trim() || !selectedTicket) return;
    try {
      setSubmittingFollowUp(true);
      setFollowUpError('');
      setFollowUpSuccess('');
      const res = await supportApi.replyToTicket(selectedTicket.id, {
        message: followUpMessage.trim(),
      });
      setFollowUpMessage('');
      setFollowUpSuccess('Your follow-up has been sent to CraftNest Support.');
      if (res && res.ticket) {
        setSelectedTicket(res.ticket);
      } else if (res && res.reply) {
        setSelectedTicket((prev) => ({
          ...prev,
          status: 'Open',
          replies: [...(prev.replies || []), res.reply],
        }));
      }
      loadSupportTickets();
    } catch (err) {
      console.error('Failed to send follow up:', err);
      setFollowUpError(err.response?.data?.message || 'Failed to send follow-up message.');
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  const activeTab = currentTab;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login?redirect=/account');
      return;
    }
    if (isAuthenticated) {
      loadAddresses();
      loadOrders();
      loadSupportTickets();
    }
  }, [isAuthenticated, authLoading, navigate, loadAddresses, loadOrders, loadSupportTickets]);

  // Deep-link support ticket check
  useEffect(() => {
    const tid = routeTicketId || searchParams.get('ticketId');
    if ((currentTab === 'support' || activeTab === 'support') && tid) {
      loadTicketDetails(tid);
    }
  }, [currentTab, activeTab, routeTicketId, searchParams, loadTicketDetails]);

  const handleTabChange = (tabId) => {
    setCurrentTab(tabId);
    setSelectedTicket(null);
    navigate(`/account/${tabId}`);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileSuccess('');
    setProfileError('');
    try {
      const res = await authApi.updateProfile({
        name: profileData.username,
        username: profileData.username,
        mobile: profileData.phone,
        phone: profileData.phone,
      });
      if (res && res.user) {
        updateUser(res.user);
      }
      setProfileSuccess('Profile updated successfully!');
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwordData.new_password.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    setUpdatingPassword(true);
    setPasswordSuccess('');
    setPasswordError('');
    try {
      await authApi.resetPassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
        password: passwordData.new_password,
      });
      setPasswordSuccess('Password changed successfully!');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPasswordError(
        err.response?.data?.message || 'Failed to change password. Verify your current password.'
      );
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await authApi.addAddress(newAddress);
      const added = res.address || res;
      setAddresses((prev) => [added, ...(Array.isArray(prev) ? prev : [])]);
      setShowAddAddress(false);
      setNewAddress({
        street: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'India',
        phone: '',
        is_default: false,
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save address.');
    }
  };

  const handleDeleteAddress = async (addrId) => {
    if (!window.confirm('Delete this delivery address?')) return;
    try {
      await authApi.deleteAddress(addrId);
      setAddresses((prev) => (Array.isArray(prev) ? prev.filter((a) => (a.id || a._id) !== addrId) : []));
    } catch (err) {
      console.error('Failed to delete address:', err);
      alert('Unable to delete address');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner label="Authenticating session..." />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const ordersCount = Array.isArray(orders) ? orders.length : 0;
  const wishlistCount = Array.isArray(wishlist) ? wishlist.length : 0;
  const addressesCount = Array.isArray(addresses) ? addresses.length : 0;

  return (
    <div className="craft-container py-8 sm:py-12 safe-bottom-padding">
      {/* Page Header */}
      <div className="mb-8 border-b border-[#E6D8CC] pb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-[#A63D40] block mb-1">
          CraftNest Patron Portal
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#2B2523]">
          My Account
        </h1>
        <p className="text-xs sm:text-sm text-[#6F625D] mt-1">
          Manage your personal details, order history, saved addresses, and security
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ==========================================================
            LEFT COLUMN: ACCOUNT PROFILE BADGE & NAV TABS (lg:col-span-4)
            ========================================================== */}
        <aside className="lg:col-span-4 bg-white rounded-3xl border border-[#E6D8CC] craft-card-shadow overflow-hidden">
          {/* User Badge */}
          <div className="p-6 text-center border-b border-[#E6D8CC] bg-[#FFF9F3]/60">
            <div className="w-16 h-16 rounded-full bg-[#A63D40] text-white flex items-center justify-center font-bold text-2xl mx-auto mb-3 shadow-sm">
              {(user?.name || user?.username || user?.email || 'P').charAt(0).toUpperCase()}
            </div>
            <h3 className="font-serif text-lg font-bold text-[#2B2523] truncate">
              {user?.name || user?.username || 'CraftNest Patron'}
            </h3>
            <p className="text-xs text-[#6F625D] truncate mt-0.5">{user?.email || ''}</p>
            <span className="inline-block mt-2 px-3 py-0.5 rounded-full bg-[#F4E8DC] text-[#A63D40] text-[11px] font-bold uppercase tracking-wider">
              {user?.role || 'Customer'}
            </span>
          </div>

          {/* Tab Navigation Buttons */}
          <nav className="divide-y divide-[#E6D8CC]/60">
            {[
              { id: 'profile', label: 'Profile Information', icon: User },
              { id: 'orders', label: `My Orders (${ordersCount})`, icon: Package },
              { id: 'support', label: `Support Messages (${Array.isArray(supportTickets) ? supportTickets.length : 0})`, icon: Headphones },
              { id: 'wishlist', label: `Saved Crafts (${wishlistCount})`, icon: Heart },
              { id: 'addresses', label: `Delivery Addresses (${addressesCount})`, icon: MapPin },
              { id: 'reviews', label: 'My Craft Reviews', icon: Star },
              { id: 'settings', label: 'Account & Security Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-full flex items-center justify-between p-4 text-xs sm:text-sm font-semibold transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'bg-[#FFF9F3] text-[#A63D40] border-l-4 border-l-[#A63D40]'
                      : 'text-[#2B2523] hover:bg-[#FFF9F3]/60 hover:text-[#A63D40]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#A63D40]' : 'text-[#6F625D]'}`} />
                    <span>{tab.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#6F625D]/50" />
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ==========================================================
            RIGHT COLUMN: TAB DETAILS (lg:col-span-8)
            ========================================================== */}
        <div className="lg:col-span-8 bg-white rounded-2xl sm:rounded-3xl border border-[#E6D8CC] p-4 sm:p-8 craft-card-shadow">
          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#2B2523]">Personal Profile</h3>
                <p className="text-xs text-[#6F625D] mt-1">
                  Update your contact details for delivery and artisan communications
                </p>
              </div>

              {profileSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>{profileError}</span>
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1.5">
                    Full Name / Patron Alias
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={profileData.username}
                      onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                      className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-[#2B2523] focus:bg-white focus:border-[#A63D40]"
                    />
                    <User className="w-4 h-4 text-[#6F625D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1.5">
                    Registered Email Address (Read-only)
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      disabled
                      value={profileData.email}
                      className="w-full bg-slate-100 border border-[#E6D8CC] rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-[#6F625D] cursor-not-allowed"
                    />
                    <Mail className="w-4 h-4 text-[#6F625D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1.5">
                    Phone / Mobile Number
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-[#2B2523] focus:bg-white focus:border-[#A63D40]"
                    />
                    <Phone className="w-4 h-4 text-[#6F625D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={updatingProfile}
                    className="px-6 py-2.5 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {updatingProfile ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#2B2523]">Order History</h3>
                  <p className="text-xs text-[#6F625D] mt-1">
                    Track the fulfillment and transit of your authentic handcrafted orders
                  </p>
                </div>
                <Link
                  to="/products"
                  className="text-xs font-semibold text-[#A63D40] hover:underline hidden sm:inline"
                >
                  Explore More Crafts →
                </Link>
              </div>

              {ordersError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-[#B84242] flex items-center justify-between">
                  <span>{ordersError}</span>
                  <button
                    type="button"
                    onClick={loadOrders}
                    className="inline-flex items-center gap-1 font-bold text-[#A63D40] hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              {loadingOrders ? (
                <div className="py-12 flex justify-center">
                  <LoadingSpinner label="Loading your orders..." />
                </div>
              ) : orders && orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((ord) => {
                    const ordId = ord.id || ord._id;
                    const items = Array.isArray(ord.items) ? ord.items : [];
                    const totalAmt = ord.total_amount || ord.total || 0;
                    const ordDate = ord.created_at || ord.order_date;
                    const formattedDate = ordDate
                      ? new Date(ordDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Recent';

                    return (
                      <div
                        key={ordId}
                        className="p-5 rounded-2xl bg-[#FFF9F3]/60 border border-[#E6D8CC] space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6D8CC]">
                          <div>
                            <span className="text-xs font-bold text-[#2B2523]">
                              Order #{ordId}
                            </span>
                            <span className="text-[11px] text-[#6F625D] block">
                              Placed on {formattedDate}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-[#A63D40]">
                              ₹{Number(totalAmt).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#F4E8DC] text-[#2B2523] block mt-0.5">
                              {ord.order_status || ord.status || 'Pending'}
                            </span>
                            {(ord.tracking_id || ord.tracking_number) && (
                              <div className="text-[10px] text-[#0369A1] font-semibold flex items-center justify-end gap-1 mt-0.5">
                                <Truck size={12} />
                                <span>AWB: {ord.tracking_id || ord.tracking_number}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Items preview */}
                        <div className="space-y-2">
                          {items.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="text-[#2B2523] font-medium truncate max-w-xs sm:max-w-md">
                                {it.product_name || it.name || 'Handcrafted Item'} × {it.quantity || 1}
                              </span>
                              <span className="text-[#6F625D]">
                                ₹{Number(it.price || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Order & Invoice Actions */}
                        <div className="pt-3 border-t border-[#E6D8CC]/60 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleViewInvoice(ord)}
                              disabled={loadingInvoiceId === (ord.order_id || ord.id || ord._id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#E6D8CC] text-[#2B2523] hover:border-[#A63D40] hover:text-[#A63D40] transition-colors shadow-sm disabled:opacity-50"
                            >
                              <FileText size={13} className="text-[#A63D40]" />
                              <span>{loadingInvoiceId === (ord.order_id || ord.id || ord._id) ? 'Loading...' : 'View Invoice'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadInvoice(ord)}
                              disabled={loadingInvoiceId === (ord.order_id || ord.id || ord._id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#FAF6F0] border border-[#E6D8CC] text-[#6F625D] hover:text-[#2B2523] hover:border-[#2B2523] transition-colors shadow-sm disabled:opacity-50"
                            >
                              <Download size={13} />
                              <span>PDF</span>
                            </button>
                          </div>
                          <Link
                            to={`/orders/${ord.id || ord.order_id}`}
                            className="text-xs font-bold text-[#A63D40] hover:underline flex items-center gap-1 ml-auto"
                          >
                            <span>Track Order Journey</span>
                            <ChevronRight size={14} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={Package}
                  title="No Orders Placed Yet"
                  description="You haven't placed any orders yet. Discover our master craft collections and support Indian artisans."
                  actionLabel="Discover Handicrafts"
                  onAction={() => navigate('/products')}
                />
              )}
            </div>
          )}

          {/* TAB: SUPPORT MESSAGES & REQUESTS */}
          {activeTab === 'support' && (
            <div className="space-y-6">
              {selectedTicket ? (
                /* ----------------- CONVERSATION THREAD VIEW ----------------- */
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E6D8CC]">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTicket(null);
                        navigate('/account/support');
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A63D40] hover:underline cursor-pointer"
                    >
                      <ArrowLeft size={16} />
                      <span>Back to All Inquiries</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#6F625D]">Status:</span>
                      {(() => {
                        const s = String(selectedTicket.status || 'Open').toLowerCase();
                        if (s === 'replied') {
                          return (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              Owner Replied
                            </span>
                          );
                        }
                        if (s === 'resolved') {
                          return (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-slate-600" />
                              Resolved
                            </span>
                          );
                        }
                        if (s === 'in progress') {
                          return (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <Clock size={12} className="text-amber-600" />
                              In Progress
                            </span>
                          );
                        }
                        return (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                            Open
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Ticket Overview Header */}
                  <div className="p-5 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg bg-[#A63D40] text-white text-xs font-bold font-mono">
                          {selectedTicket.ticket_id || `TKT-${String(selectedTicket.id).padStart(4, '0')}`}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-[#E6D8CC] text-[#2B2523] text-xs font-semibold">
                          {selectedTicket.category || 'General Inquiry'}
                        </span>
                        {selectedTicket.order_id && (
                          <span className="px-2.5 py-1 rounded-lg bg-white border border-[#C69A5B]/40 text-[#C69A5B] text-xs font-semibold flex items-center gap-1">
                            <Package size={12} />
                            Order Ref: {selectedTicket.order_id}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#6F625D]">
                        Created {new Date(selectedTicket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <h3 className="font-serif text-lg font-bold text-[#2B2523]">
                      {selectedTicket.subject || 'Support Query'}
                    </h3>
                  </div>

                  {/* Conversation History Thread */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#6F625D]">
                      Conversation History
                    </h4>

                    {/* Initial Customer Inquiry Card */}
                    <div className="p-5 rounded-2xl bg-white border border-[#E6D8CC] shadow-2xs space-y-2">
                      <div className="flex items-center justify-between border-b border-[#E6D8CC]/60 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#E6D8CC] text-[#2B2523] flex items-center justify-center text-xs font-bold">
                            {(selectedTicket.name || user?.name || 'You').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#2B2523]">
                              {selectedTicket.name || user?.name || 'You'} (Your Initial Inquiry)
                            </span>
                            <span className="text-[10px] text-[#6F625D] block">
                              {selectedTicket.email}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] text-[#6F625D]">
                          {new Date(selectedTicket.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-[#2B2523] leading-relaxed whitespace-pre-wrap pt-1">
                        {selectedTicket.message}
                      </div>
                    </div>

                    {/* Chronological Replies from Owner / Customer */}
                    {Array.isArray(selectedTicket.replies) && selectedTicket.replies.length > 0 ? (
                      selectedTicket.replies.map((reply, idx) => {
                        const sStr = String(reply.sender || '').toLowerCase();
                        const isOwnerReply =
                          sStr.includes('support') ||
                          sStr.includes('admin') ||
                          sStr.includes('owner') ||
                          sStr.includes('craftnest');

                        return (
                          <div
                            key={reply.id || idx}
                            className={`p-5 rounded-2xl transition-all shadow-2xs space-y-2 ${
                              isOwnerReply
                                ? 'bg-[#FFF9F3] border-l-4 border-l-[#A63D40] border border-[#E6D8CC]'
                                : 'bg-white border border-[#E6D8CC]'
                            }`}
                          >
                            <div className="flex items-center justify-between border-b border-[#E6D8CC]/60 pb-2.5">
                              <div className="flex items-center gap-2.5">
                                {isOwnerReply ? (
                                  <div className="w-7 h-7 rounded-full bg-[#A63D40] text-white flex items-center justify-center text-xs font-bold">
                                    <Sparkles size={14} />
                                  </div>
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-[#E6D8CC] text-[#2B2523] flex items-center justify-center text-xs font-bold">
                                    {(reply.sender || 'You').charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-[#2B2523]">
                                    {isOwnerReply ? 'CraftNest Support' : (reply.sender || 'You')}
                                  </span>
                                  {isOwnerReply && (
                                    <span className="px-2 py-0.5 rounded-full bg-[#A63D40] text-white text-[10px] font-bold uppercase tracking-wider">
                                      Owner Team Reply
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-[11px] text-[#6F625D]">
                                {reply.created_at
                                  ? new Date(reply.created_at).toLocaleDateString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : ''}
                              </span>
                            </div>
                            <div className="text-xs sm:text-sm text-[#2B2523] leading-relaxed whitespace-pre-wrap pt-1">
                              {reply.message}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 rounded-xl bg-[#FFF9F3]/60 border border-dashed border-[#E6D8CC] text-center text-xs text-[#6F625D]">
                        No replies yet. Our artisan care team typically responds within 24 hours.
                      </div>
                    )}
                  </div>

                  {/* Follow-up Message Composer */}
                  <div className="p-6 rounded-2xl bg-[#FFF9F3]/60 border border-[#E6D8CC] space-y-3">
                    <div>
                      <h4 className="font-serif text-sm font-bold text-[#2B2523]">
                        Send a Follow-up Message
                      </h4>
                      <p className="text-[11px] text-[#6F625D]">
                        Have further questions or need additional assistance? Reply directly to the Owner support team.
                      </p>
                    </div>

                    {followUpSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                        <Check size={14} className="text-emerald-600" />
                        <span>{followUpSuccess}</span>
                      </div>
                    )}

                    {followUpError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                        <AlertCircle size={14} className="text-rose-600" />
                        <span>{followUpError}</span>
                      </div>
                    )}

                    <form onSubmit={handleSendFollowUp} className="space-y-3">
                      <textarea
                        rows={3}
                        required
                        value={followUpMessage}
                        onChange={(e) => setFollowUpMessage(e.target.value)}
                        placeholder="Type your message or response here..."
                        className="w-full bg-white border border-[#E6D8CC] rounded-xl p-3 text-xs sm:text-sm text-[#2B2523] focus:border-[#A63D40] focus:ring-1 focus:ring-[#A63D40] transition-all resize-y"
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={submittingFollowUp || !followUpMessage.trim()}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Send size={13} />
                          <span>{submittingFollowUp ? 'Sending Message...' : 'Send Follow-up Message'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : (
                /* ----------------- SUPPORT TICKETS LIST VIEW ----------------- */
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-serif text-xl font-bold text-[#2B2523]">
                        My Support Requests & Inquiries
                      </h3>
                      <p className="text-xs text-[#6F625D] mt-1">
                        Track your inquiries, read replies from the Owner, and send follow-ups
                      </p>
                    </div>
                    <Link
                      to="/contact"
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto shrink-0"
                    >
                      <Plus size={14} />
                      <span>New Inquiry</span>
                    </Link>
                  </div>

                  {/* Filter Status Buttons */}
                  <div className="flex items-center gap-2 flex-wrap border-b border-[#E6D8CC] pb-3">
                    {[
                      { id: 'all', label: 'All Inquiries', count: supportTickets.length },
                      { id: 'open', label: 'Open', count: supportTickets.filter((t) => ['open', 'pending'].includes(String(t.status || '').toLowerCase())).length },
                      { id: 'replied', label: 'Replied', count: supportTickets.filter((t) => String(t.status || '').toLowerCase() === 'replied').length },
                      { id: 'resolved', label: 'Resolved', count: supportTickets.filter((t) => String(t.status || '').toLowerCase() === 'resolved').length },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSupportFilter(tab.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                          supportFilter === tab.id
                            ? 'bg-[#A63D40] text-white shadow-2xs'
                            : 'bg-[#FFF9F3] text-[#2B2523] border border-[#E6D8CC] hover:bg-[#F4E8DC]'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          supportFilter === tab.id ? 'bg-white/20 text-white' : 'bg-white text-[#6F625D]'
                        }`}>
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {supportError && (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-[#B84242] flex items-center justify-between">
                      <span>{supportError}</span>
                      <button
                        type="button"
                        onClick={loadSupportTickets}
                        className="inline-flex items-center gap-1 font-bold text-[#A63D40] hover:underline cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                    </div>
                  )}

                  {loadingTickets ? (
                    <div className="py-12 flex justify-center">
                      <LoadingSpinner label="Loading support requests..." />
                    </div>
                  ) : (() => {
                    const filtered = (supportTickets || []).filter((t) => {
                      if (supportFilter === 'all') return true;
                      if (supportFilter === 'open') return ['open', 'pending'].includes(String(t.status || '').toLowerCase());
                      if (supportFilter === 'replied') return String(t.status || '').toLowerCase() === 'replied';
                      if (supportFilter === 'resolved') return String(t.status || '').toLowerCase() === 'resolved';
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <EmptyState
                          icon={Headphones}
                          title={supportTickets.length === 0 ? "No Support Inquiries Yet" : "No Matching Inquiries"}
                          description={
                            supportTickets.length === 0
                              ? "Need help with handcrafted jewelry, pottery, or order tracking? Submit an inquiry to reach our care specialists."
                              : "No support tickets match the selected filter."
                          }
                          actionLabel="Contact Customer Care"
                          onAction={() => navigate('/contact')}
                        />
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {filtered.map((ticket) => {
                          const replyCount = Array.isArray(ticket.replies) ? ticket.replies.length : 0;
                          const hasOwnerReply =
                            replyCount > 0 &&
                            ticket.replies.some((r) => {
                              const s = String(r.sender || '').toLowerCase();
                              return s.includes('support') || s.includes('admin') || s.includes('owner') || s.includes('craftnest');
                            });

                          return (
                            <div
                              key={ticket.id}
                              onClick={() => {
                                setSelectedTicket(ticket);
                                navigate(`/account/support/${ticket.id}`);
                              }}
                              className="p-5 rounded-2xl border border-[#E6D8CC] bg-white hover:border-[#A63D40] hover:shadow-md transition-all cursor-pointer space-y-3 group"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs font-bold text-[#A63D40]">
                                    {ticket.ticket_id || `TKT-${String(ticket.id).padStart(4, '0')}`}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FFF9F3] border border-[#E6D8CC] text-[#2B2523]">
                                    {ticket.category || 'General Inquiry'}
                                  </span>
                                  {ticket.order_id && (
                                    <span className="text-[11px] font-medium text-[#C69A5B]">
                                      Order Ref: {ticket.order_id}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const s = String(ticket.status || 'Open').toLowerCase();
                                    if (s === 'replied') {
                                      return (
                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                          Owner Replied
                                        </span>
                                      );
                                    }
                                    if (s === 'resolved') {
                                      return (
                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                          Resolved
                                        </span>
                                      );
                                    }
                                    if (s === 'in progress') {
                                      return (
                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                          In Progress
                                        </span>
                                      );
                                    }
                                    return (
                                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                        Open
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>

                              <div>
                                <h4 className="text-sm font-bold text-[#2B2523] group-hover:text-[#A63D40] transition-colors mb-1">
                                  {ticket.subject || 'Support Query'}
                                </h4>
                                <p className="text-xs text-[#6F625D] line-clamp-2 leading-relaxed">
                                  {ticket.message}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-[#E6D8CC]/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6F625D]">
                                <span>
                                  Submitted {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                                </span>
                                <div className="flex items-center gap-3">
                                  {replyCount > 0 ? (
                                    <span className={`inline-flex items-center gap-1 font-semibold ${hasOwnerReply ? 'text-emerald-700' : 'text-[#6F625D]'}`}>
                                      <MessageSquare size={13} />
                                      <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
                                    </span>
                                  ) : (
                                    <span className="text-[#6F625D]">Awaiting reply</span>
                                  )}
                                  <span className="font-bold text-[#A63D40] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                                    <span>View Conversation</span>
                                    <ChevronRight size={14} />
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WISHLIST */}
          {activeTab === 'wishlist' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#2B2523]">Saved Crafts</h3>
                  <p className="text-xs text-[#6F625D] mt-1">
                    Your personal wishlist of curated Indian treasures
                  </p>
                </div>
              </div>

              {wishlist && wishlist.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {wishlist.map((item) => {
                    const itemId = String(item.id || item._id);
                    const itemPrice = Number(item.price || 0);
                    const itemDiscount = Number(item.discount || 0);
                    const effectivePrice = itemDiscount > 0 ? Math.round(itemPrice * (1 - itemDiscount / 100)) : itemPrice;
                    const imgUrl = item.image || item.image_url || (item.images && item.images[0]) || 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=400&q=80';

                    return (
                      <div
                        key={itemId}
                        className="p-3.5 rounded-2xl bg-[#FFF9F3]/60 border border-[#E6D8CC] flex gap-3.5 items-center"
                      >
                        <Link
                          to={`/products/${itemId}`}
                          className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-[#E6D8CC] shrink-0"
                        >
                          <img
                            src={imgUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </Link>

                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/products/${itemId}`}
                            className="font-serif text-xs font-bold text-[#2B2523] hover:text-[#A63D40] line-clamp-1 block"
                          >
                            {item.name}
                          </Link>
                          <span className="text-xs font-bold text-[#A63D40] block mt-0.5">
                            ₹{effectivePrice.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => addToCart(item, 1)}
                            className="p-2 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs cursor-pointer"
                            title="Add to Basket"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromWishlist(itemId)}
                            className="p-2 rounded-xl text-[#6F625D] hover:text-[#B84242] hover:bg-rose-50 cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={Heart}
                  title="Your Wishlist is Empty"
                  description="Explore our collection and click the heart icon on any craft to save it for later."
                  actionLabel="Browse Creations"
                  onAction={() => navigate('/products')}
                />
              )}
            </div>
          )}

          {/* TAB 4: ADDRESSES */}
          {activeTab === 'addresses' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#2B2523]">Delivery Destinations</h3>
                  <p className="text-xs text-[#6F625D] mt-1">
                    Manage your shipping addresses for safe artisanal deliveries
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddAddress(!showAddAddress)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#A63D40] text-white text-xs font-semibold hover:bg-[#8F3034] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddAddress ? 'Cancel' : 'Add New Address'}</span>
                </button>
              </div>

              {addressesError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-[#B84242] flex items-center justify-between">
                  <span>{addressesError}</span>
                  <button
                    type="button"
                    onClick={loadAddresses}
                    className="inline-flex items-center gap-1 font-bold text-[#A63D40] hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              {/* Add Address Form */}
              {showAddAddress && (
                <form onSubmit={handleAddAddress} className="p-5 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC] space-y-3">
                  <h4 className="font-serif text-sm font-bold text-[#2B2523]">New Delivery Address</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <input
                      type="text"
                      required
                      placeholder="Street Address, Building, Landmark"
                      value={newAddress.street}
                      onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                      className="sm:col-span-2 bg-white border border-[#E6D8CC] rounded-xl px-3 py-2 text-[#2B2523] focus:border-[#A63D40]"
                    />
                    <input
                      type="text"
                      required
                      placeholder="City / District"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      className="bg-white border border-[#E6D8CC] rounded-xl px-3 py-2 text-[#2B2523] focus:border-[#A63D40]"
                    />
                    <input
                      type="text"
                      required
                      placeholder="State (e.g. Rajasthan, UP)"
                      value={newAddress.state}
                      onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                      className="bg-white border border-[#E6D8CC] rounded-xl px-3 py-2 text-[#2B2523] focus:border-[#A63D40]"
                    />
                    <input
                      type="text"
                      required
                      placeholder="PIN Code (6 digits)"
                      value={newAddress.postal_code}
                      onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                      className="bg-white border border-[#E6D8CC] rounded-xl px-3 py-2 text-[#2B2523] focus:border-[#A63D40]"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="Recipient Contact Phone"
                      value={newAddress.phone}
                      onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                      className="bg-white border border-[#E6D8CC] rounded-xl px-3 py-2 text-[#2B2523] focus:border-[#A63D40]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#A63D40] text-white text-xs font-semibold hover:bg-[#8F3034] cursor-pointer"
                  >
                    Save Address
                  </button>
                </form>
              )}

              {/* Address List */}
              {loadingAddresses ? (
                <div className="py-8 flex justify-center">
                  <LoadingSpinner label="Loading addresses..." />
                </div>
              ) : addresses && addresses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addresses.map((addr) => {
                    const aId = addr.id || addr._id;
                    return (
                      <div
                        key={aId}
                        className="p-4 rounded-2xl bg-[#FFF9F3]/60 border border-[#E6D8CC] space-y-2 relative"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-[#2B2523]">
                            <Home className="w-3.5 h-3.5 text-[#A63D40]" />
                            <span>Delivery Destination</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(aId)}
                            className="text-[#6F625D] hover:text-[#B84242] p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-[#2B2523] leading-relaxed">
                          {addr.street || addr.address_line_1}
                          <br />
                          {addr.city}, {addr.state} - {addr.postal_code || addr.pincode}
                        </p>
                        {addr.phone && (
                          <p className="text-[11px] text-[#6F625D]">Phone: {addr.phone}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={MapPin}
                  title="No Delivery Addresses Saved"
                  description="Add a shipping address for faster, seamless checkout."
                  actionLabel="Add New Address"
                  onAction={() => setShowAddAddress(true)}
                />
              )}
            </div>
          )}

          {/* TAB 5: SETTINGS & SECURITY */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#2B2523]">Security & Settings</h3>
                <p className="text-xs text-[#6F625D] mt-1">
                  Manage authentication password and login safeguards
                </p>
              </div>

              {passwordSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordData.current_password}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, current_password: e.target.value })
                    }
                    placeholder="••••••••"
                    className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2.5 px-3.5 text-xs text-[#2B2523] focus:bg-white focus:border-[#A63D40]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1.5">
                    New Secure Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordData.new_password}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, new_password: e.target.value })
                    }
                    placeholder="Minimum 6 characters"
                    className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2.5 px-3.5 text-xs text-[#2B2523] focus:bg-white focus:border-[#A63D40]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2523] mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordData.confirm_password}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirm_password: e.target.value })
                    }
                    placeholder="Re-enter new password"
                    className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-xl py-2.5 px-3.5 text-xs text-[#2B2523] focus:bg-white focus:border-[#A63D40]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="px-6 py-2.5 rounded-xl bg-[#A63D40] text-white hover:bg-[#8F3034] text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {updatingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 6: REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="bg-white rounded-3xl border border-[#E6D8CC] p-6 sm:p-8 craft-card-shadow space-y-6">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2B2523]">
                  My Craft Reviews & Feedback
                </h2>
                <p className="text-xs text-[#6F625D] mt-1">
                  Share your experiences with authentic handicrafts to support heritage artisans
                </p>
              </div>

              {!orders || orders.length === 0 ? (
                <EmptyState
                  icon={Star}
                  title="No craft reviews yet"
                  description="When you receive handcrafted items, you can rate and review them directly from your orders to support master artisans."
                  actionLabel="Explore Handicrafts"
                  onAction={() => navigate('/products')}
                />
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-[#2B2523]">
                        Verified Patron Reviews
                      </p>
                      <p className="text-[11px] text-[#6F625D]">
                        Your reviews directly celebrate artisan craftsmanship across Rajasthan, Kashmir, and Uttar Pradesh.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-[#F4E8DC] text-[#A63D40] text-xs font-bold shrink-0 self-start sm:self-auto">
                      Community Patron
                    </span>
                  </div>

                  <div className="divide-y divide-[#E6D8CC]/60 border-t border-[#E6D8CC]/60">
                    {(orders || []).slice(0, 5).map((ord) => (
                      <div key={ord.id || ord._id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-[#2B2523]">
                            Order {ord.order_id || `#${ord.id || ord._id}`}
                          </p>
                          <p className="text-[11px] text-[#6F625D]">
                            {(ord.items || []).map((it) => it.name || it.product_name).join(', ') || 'Handcrafted items'}
                          </p>
                        </div>
                        <Link
                          to={`/account/orders/${ord.id || ord.order_id || ord._id}`}
                          className="px-4 py-1.5 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] text-[#A63D40] text-xs font-semibold hover:bg-[#F4E8DC] text-center shrink-0"
                        >
                          Review Items
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invoice Modal */}
      <InvoiceModal
        invoice={selectedInvoice}
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
      />
    </div>
  );
}
