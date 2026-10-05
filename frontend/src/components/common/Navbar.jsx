import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Heart,
  ShoppingBag,
  User,
  Menu,
  X,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Package,
  Headphones,
  Sparkles,
  Bell,
  CheckCheck,
  RefreshCw,
  Truck,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { notificationsApi } from '../../api/notifications';
import Badge from './Badge';

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, isOwner, isSubOwner, isSeller, isCustomer, isAuthenticated, logout } = useAuth();
  const { totalItemsCount } = useCart();
  const { wishlistCount } = useWishlist();

  const canShop = !isOwner && !isSeller && !isSubOwner;

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  // Fetch notifications for authenticated customers
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !isCustomer) {
      setNotifications([]);
      return;
    }
    try {
      setLoadingNotifs(true);
      const res = await notificationsApi.getNotifications();
      const list = Array.isArray(res) ? res : res.items || [];
      setNotifications(list);
    } catch (err) {
      console.error('Failed to fetch customer notifications:', err);
    } finally {
      setLoadingNotifs(false);
    }
  }, [isAuthenticated, isCustomer]);

  // Initial fetch and periodic background poll
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAccountDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close menus when route changes
  useEffect(() => {
    setAccountDropdownOpen(false);
    setNotificationsOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    setAccountDropdownOpen(false);
    setNotificationsOpen(false);
    await logout();
    navigate('/');
  };

  const handleMarkAsRead = async (notifId, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationsApi.markAsRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const handleClearRead = async () => {
    try {
      await notificationsApi.clearRead();
      setNotifications((prev) => prev.filter((n) => !n.read));
    } catch (err) {
      console.error('Failed to clear read notifications:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      handleMarkAsRead(notif.id);
    }
    setNotificationsOpen(false);

    // Deep navigation
    const tLower = String(notif.type || '').toLowerCase();
    if (notif.ticket_id || tLower.includes('support') || tLower.includes('ticket')) {
      const tid = notif.ticket_id || '';
      navigate(`/account?tab=support${tid ? `&ticketId=${tid}` : ''}`);
    } else if (notif.order_id || tLower.includes('order')) {
      const oid = notif.order_id || '';
      if (oid) {
        navigate(`/orders/${oid}`);
      } else {
        navigate('/account?tab=orders');
      }
    } else {
      navigate('/account');
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const now = new Date();
      const diffSec = Math.floor((now - d) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getNotificationIcon = (type = '') => {
    const t = String(type).toLowerCase();
    if (t.includes('support') || t.includes('ticket')) {
      return <Headphones className="w-4 h-4 text-[#A63D40]" />;
    }
    if (t.includes('refund')) {
      return <RefreshCw className="w-4 h-4 text-emerald-600" />;
    }
    if (t.includes('order') || t.includes('tracking') || t.includes('ship')) {
      return <Truck className="w-4 h-4 text-[#C69A5B]" />;
    }
    return <Bell className="w-4 h-4 text-[#2B2523]" />;
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-[#E6D8CC] shadow-xs">
      {/* 1. TOP ANNOUNCEMENT BAR */}
      <div className="bg-[#A63D40] text-white text-[11px] sm:text-xs py-1.5 px-3 sm:px-4 text-center font-medium tracking-normal sm:tracking-wide flex items-center justify-center gap-1.5 overflow-hidden">
        <Sparkles className="w-3.5 h-3.5 text-[#C69A5B] shrink-0" />
        <span className="truncate max-w-full">
          Authentic Indian Handicrafts Directly from Hereditary Master Artisans • Free Pan-India Delivery on Orders Above ₹999
        </span>
      </div>

      {/* 2. MAIN NAVBAR WITH WIDE RESPONSIVE DESKTOP LAYOUT */}
      <div className="craft-container">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4 lg:gap-8">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0 group">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center text-[#A63D40] group-hover:bg-[#F4E8DC] transition-colors">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#A63D40]" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-wider text-[#2B2523] group-hover:text-[#A63D40] transition-colors">
                CRAFT<span className="text-[#A63D40]">NEST</span>
              </span>
              <span className="text-[8px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase font-semibold text-[#C69A5B] -mt-0.5 sm:-mt-1">
                Heritage Handicrafts
              </span>
            </div>
          </Link>

          {/* Large Centered Search Bar (Desktop) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-xl mx-4 lg:mx-8 relative"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search handcrafted blue pottery, brassware, Banarasi handloom..."
              className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-full py-2.5 pl-5 pr-12 text-xs sm:text-sm text-[#2B2523] placeholder-[#6F625D]/70 focus:bg-white focus:border-[#A63D40] focus:ring-1 focus:ring-[#A63D40] transition-all"
            />
            <button
              type="submit"
              aria-label="Submit Search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#A63D40] text-white hover:bg-[#8F3034] transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* Desktop Navigation Links (Home, All Crafts) */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#2B2523] shrink-0">
            <Link
              to="/"
              className={`hover:text-[#A63D40] transition-colors ${
                location.pathname === '/' ? 'text-[#A63D40] font-semibold' : ''
              }`}
            >
              Home
            </Link>
            <Link
              to="/products"
              className={`hover:text-[#A63D40] transition-colors ${
                location.pathname.startsWith('/products') ? 'text-[#A63D40] font-semibold' : ''
              }`}
            >
              All Crafts
            </Link>
          </nav>

          {/* Right Action Icons (Notification Bell, Wishlist, Cart, Account) */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            {/* Customer Notification Bell */}
            {canShop && (
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      navigate('/login');
                      return;
                    }
                    setNotificationsOpen(!notificationsOpen);
                    setAccountDropdownOpen(false);
                  }}
                  className="relative p-1.5 sm:p-2 text-[#2B2523] hover:text-[#A63D40] hover:bg-[#FFF9F3] rounded-full transition-colors cursor-pointer"
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <Bell className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#A63D40] text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center animate-pulse shadow-xs">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown Panel - Guaranteed Viewport Bound */}
                {notificationsOpen && (
                  <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 mt-2 w-auto sm:w-96 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-[#E6D8CC] py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 craft-card-shadow">
                    {/* Header */}
                    <div className="px-4 pb-3 border-b border-[#E6D8CC] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-[#A63D40]" />
                        <h4 className="font-serif font-bold text-sm text-[#2B2523]">Notifications</h4>
                        {unreadCount > 0 && (
                          <span className="bg-[#FFF9F3] border border-[#E6D8CC] text-[#A63D40] text-[11px] font-semibold px-2 py-0.5 rounded-full">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllAsRead}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#A63D40] hover:underline cursor-pointer"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Mark all read</span>
                        </button>
                      )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-80 sm:max-h-96 overflow-y-auto divide-y divide-[#E6D8CC]/40">
                      {loadingNotifs && notifications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-[#6F625D]">
                          Loading notifications...
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="py-10 px-4 text-center">
                          <div className="w-12 h-12 rounded-full bg-[#FFF9F3] text-[#A63D40] flex items-center justify-center mx-auto mb-3">
                            <Bell className="w-6 h-6 opacity-60" />
                          </div>
                          <p className="font-semibold text-xs text-[#2B2523] mb-1">
                            No notifications yet
                          </p>
                          <p className="text-[11px] text-[#6F625D] max-w-[220px] mx-auto leading-relaxed">
                            Updates on your orders and replies to your support inquiries will appear here.
                          </p>
                        </div>
                      ) : (
                        notifications.map((notif) => {
                          const isUnread = !notif.read;
                          return (
                            <div
                              key={notif.id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`p-3.5 sm:p-4 flex items-start gap-3 hover:bg-[#FFF9F3]/80 transition-colors cursor-pointer group ${
                                isUnread ? 'bg-[#FFF9F3]/40' : 'bg-white'
                              }`}
                            >
                              <div className="w-8 h-8 rounded-xl bg-white border border-[#E6D8CC] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                                {getNotificationIcon(notif.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <h5
                                    className={`text-xs truncate ${
                                      isUnread ? 'font-bold text-[#2B2523]' : 'font-medium text-[#2B2523]'
                                    }`}
                                  >
                                    {notif.title}
                                  </h5>
                                  <span className="text-[10px] text-[#6F625D] shrink-0">
                                    {formatTimeAgo(notif.created_at)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#6F625D] line-clamp-2 leading-relaxed">
                                  {notif.message}
                                </p>
                                {notif.ticket_id && (
                                  <span className="inline-block mt-1 text-[10px] font-semibold text-[#A63D40]">
                                    Ticket #{notif.ticket_id} →
                                  </span>
                                )}
                                {notif.order_id && (
                                  <span className="inline-block mt-1 text-[10px] font-semibold text-[#C69A5B]">
                                    Order #{notif.order_id} →
                                  </span>
                                )}
                              </div>
                              {isUnread && (
                                <button
                                  type="button"
                                  onClick={(e) => handleMarkAsRead(notif.id, e)}
                                  title="Mark as read"
                                  className="w-2 h-2 rounded-full bg-[#A63D40] shrink-0 mt-2 group-hover:scale-125 transition-transform"
                                />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer Actions */}
                    {notifications.length > 0 && (
                      <div className="px-4 pt-2.5 border-t border-[#E6D8CC] flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={handleClearRead}
                          className="text-[#6F625D] hover:text-[#2B2523] transition-colors cursor-pointer"
                        >
                          Clear read
                        </button>
                        <Link
                          to="/account?tab=support"
                          onClick={() => setNotificationsOpen(false)}
                          className="font-semibold text-[#A63D40] hover:underline flex items-center gap-1"
                        >
                          <span>Support Inquiries</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Wishlist Link - Customers only */}
            {canShop && (
              <Link
                to="/wishlist"
                className="relative p-1.5 sm:p-2 text-[#2B2523] hover:text-[#A63D40] hover:bg-[#FFF9F3] rounded-full transition-colors"
                aria-label="View Wishlist"
              >
                <Heart className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#A63D40] text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>
            )}

            {/* Cart Link - Customers only */}
            {canShop && (
              <Link
                to="/cart"
                className="relative p-1.5 sm:p-2 text-[#2B2523] hover:text-[#A63D40] hover:bg-[#FFF9F3] rounded-full transition-colors"
                aria-label="View Shopping Basket"
              >
                <ShoppingBag className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                {totalItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#A63D40] text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                    {totalItemsCount}
                  </span>
                )}
              </Link>
            )}

            {/* Account / Login Dropdown */}
            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setAccountDropdownOpen(!accountDropdownOpen);
                    setNotificationsOpen(false);
                  }}
                  className="flex items-center gap-1.5 p-1 sm:px-3 sm:py-2 rounded-full border border-[#E6D8CC] bg-[#FFF9F3] hover:bg-[#F4E8DC] transition-colors cursor-pointer text-xs font-semibold text-[#2B2523]"
                >
                  <div className="w-6 h-6 rounded-full bg-[#A63D40] text-white flex items-center justify-center text-xs font-bold uppercase shrink-0">
                    {(user?.name || user?.username || 'U').charAt(0)}
                  </div>
                  <span className="hidden sm:inline max-w-[110px] truncate">
                    {user?.name || user?.username || 'Account'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#6F625D]" />
                </button>

                {/* Dropdown Menu */}
                {accountDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#E6D8CC] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-[#E6D8CC]">
                      <p className="text-xs font-bold text-[#2B2523] truncate">
                        {user?.name || user?.username}
                      </p>
                      <p className="text-[11px] text-[#6F625D] truncate">{user?.email}</p>
                      <div className="mt-1">
                        <Badge status={role} />
                      </div>
                    </div>

                    {/* Owner / Admin: Show only Owner Dashboard */}
                    {isOwner && (
                      <Link
                        to="/owner/dashboard"
                        onClick={() => setAccountDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#2B2523] hover:bg-[#FFF9F3] hover:text-[#A63D40] transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#A63D40]" />
                        <span>Owner Dashboard</span>
                      </Link>
                    )}

                    {/* Sub-Owner: Show Operations Dashboard */}
                    {isSubOwner && (
                      <Link
                        to="/sub-owner/dashboard"
                        onClick={() => setAccountDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#2B2523] hover:bg-[#FFF9F3] hover:text-[#A63D40] transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#A63D40]" />
                        <span>Operations Dashboard</span>
                      </Link>
                    )}

                    {/* Seller: Show only Artisan Portal */}
                    {isSeller && (
                      <Link
                        to="/seller/dashboard"
                        onClick={() => setAccountDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#2B2523] hover:bg-[#FFF9F3] hover:text-[#A63D40] transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#A63D40]" />
                        <span>Artisan Portal</span>
                      </Link>
                    )}

                    {/* Customer: Show My Orders, Support Messages, Profile & Saved Addresses */}
                    {isCustomer && (
                      <>
                        <Link
                          to="/account/orders"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#2B2523] hover:bg-[#FFF9F3] hover:text-[#A63D40] transition-colors"
                        >
                          <Package className="w-4 h-4 text-[#C69A5B]" />
                          <span>My Orders</span>
                        </Link>

                        <Link
                          to="/account?tab=support"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#2B2523] hover:bg-[#FFF9F3] hover:text-[#A63D40] transition-colors"
                        >
                          <Headphones className="w-4 h-4 text-[#A63D40]" />
                          <span>Support Messages</span>
                        </Link>

                        <Link
                          to="/account"
                          onClick={() => setAccountDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#2B2523] hover:bg-[#FFF9F3] hover:text-[#A63D40] transition-colors"
                        >
                          <User className="w-4 h-4 text-[#6F625D]" />
                          <span>Profile & Saved Addresses</span>
                        </Link>
                      </>
                    )}

                    <div className="border-t border-[#E6D8CC] mt-1 pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#B84242] hover:bg-rose-50 transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[#A63D40] text-white hover:bg-[#8F3034] text-[11px] sm:text-xs font-semibold shadow-xs transition-colors shrink-0"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Mobile Drawer Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 sm:p-2 rounded-lg text-[#2B2523] hover:bg-[#FFF9F3] transition-colors shrink-0"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          </div>
        </div>

        {/* 3. MOBILE SEARCH ROW (Full Width Row) */}
        <div className="md:hidden pb-2.5 pt-0.5 px-1 sm:px-0">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search handicrafts, blue pottery, handloom..."
              className="w-full bg-[#FFF9F3] border border-[#E6D8CC] rounded-full py-2 pl-4 pr-11 text-xs text-[#2B2523] placeholder-[#6F625D]/70 focus:bg-white focus:border-[#A63D40] focus:ring-1 focus:ring-[#A63D40] transition-all"
            />
            <button
              type="submit"
              aria-label="Search"
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-[#A63D40] text-white hover:bg-[#8F3034] cursor-pointer transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* 4. MOBILE DRAWER MENU */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E6D8CC] bg-white px-4 pt-3 pb-6 space-y-3">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-[#2B2523] hover:text-[#A63D40] py-1.5"
          >
            Home
          </Link>
          <Link
            to="/products"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-[#2B2523] hover:text-[#A63D40] py-1.5"
          >
            All Handcrafted Collections
          </Link>
          <Link
            to="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-[#2B2523] hover:text-[#A63D40] py-1.5"
          >
            About CraftNest Heritage
          </Link>

          {isAuthenticated && (
            <div className="pt-3 border-t border-[#E6D8CC] space-y-2">
              {isOwner && (
                <Link
                  to="/owner/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-sm font-semibold text-[#A63D40] py-1.5"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Owner Dashboard</span>
                </Link>
              )}

              {isSubOwner && (
                <Link
                  to="/sub-owner/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-sm font-semibold text-[#A63D40] py-1.5"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Operations Dashboard</span>
                </Link>
              )}

              {isSeller && (
                <Link
                  to="/seller/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-sm font-semibold text-[#A63D40] py-1.5"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Artisan Portal</span>
                </Link>
              )}

              {isCustomer && (
                <>
                  <Link
                    to="/account/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-sm font-medium text-[#2B2523] py-1.5"
                  >
                    <Package className="w-4 h-4 text-[#C69A5B]" />
                    <span>My Orders</span>
                  </Link>
                  <Link
                    to="/account?tab=support"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-sm font-medium text-[#2B2523] py-1.5"
                  >
                    <Headphones className="w-4 h-4 text-[#A63D40]" />
                    <span>Support Messages</span>
                  </Link>
                  <Link
                    to="/account"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-sm font-medium text-[#2B2523] py-1.5"
                  >
                    <User className="w-4 h-4 text-[#6F625D]" />
                    <span>Profile & Saved Addresses</span>
                  </Link>
                </>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm font-medium text-[#B84242] py-1.5 w-full text-left cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
