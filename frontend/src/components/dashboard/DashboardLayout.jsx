import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Users,
  Store,
  Shield,
  Layers,
  CreditCard,
  BarChart3,
  Image,
  Settings,
  Database,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles,
  FileText,
  Plus,
  Headphones,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Badge from '../common/Badge';
import { supportApi } from '../../api/support';

export const DashboardLayout = ({ title, subtitle, children, role: propRole, activeNav }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role: contextRole, isOwner, isSubOwner, isSeller, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unresolvedSupportCount, setUnresolvedSupportCount] = useState(0);

  const activeRole = propRole || contextRole;

  React.useEffect(() => {
    if (isOwner || activeRole === 'admin' || activeRole === 'owner') {
      supportApi.getUnreadCount()
        .then((res) => {
          const count = res?.unresolved_count ?? res?.unread_count ?? 0;
          setUnresolvedSupportCount(count);
        })
        .catch(() => {});
    }
  }, [isOwner, activeRole, location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Build navigation items based on active role
  const getNavSections = () => {
    if (isOwner || activeRole === 'admin' || activeRole === 'owner') {
      return [
        {
          heading: 'Core',
          items: [
            { path: '/owner/dashboard', label: 'Overview', icon: LayoutDashboard },
            { path: '/owner/products', label: 'Products', icon: Package },
            { path: '/owner/categories', label: 'Categories', icon: FolderTree },
            { path: '/owner/orders', label: 'Orders', icon: ShoppingBag },
          ],
        },
        {
          heading: 'Stakeholders',
          items: [
            { path: '/owner/customers', label: 'Customers', icon: Users },
            { path: '/owner/sellers', label: 'Sellers / Artisans', icon: Store },
            { path: '/owner/sub-owners', label: 'Sub Owners', icon: Shield },
            { path: '/owner/support', label: 'Support', icon: Headphones, badgeCount: unresolvedSupportCount },
          ],
        },
        {
          heading: 'Financials & Store',
          items: [
            { path: '/owner/invoices', label: 'Invoices', icon: FileText },
            { path: '/owner/inventory', label: 'Inventory', icon: Layers },
            { path: '/owner/payments', label: 'Payments', icon: CreditCard },
            { path: '/owner/reports', label: 'Reports & Analytics', icon: BarChart3 },
            { path: '/owner/banners', label: 'Promotions & Banners', icon: Image },
            { path: '/owner/databases', label: 'Multi-Database Hub', icon: Database },
            { path: '/owner/settings', label: 'Platform Settings', icon: Settings },
          ],
        },
      ];
    }

    if (isSubOwner || activeRole === 'sub_owner') {
      return [
        {
          heading: 'Operations',
          items: [
            { path: '/sub-owner/dashboard', label: 'Overview', icon: LayoutDashboard },
            { path: '/sub-owner/orders', label: 'Order Fulfillment', icon: ShoppingBag },
            { path: '/sub-owner/invoices', label: 'Invoices', icon: FileText },
            { path: '/sub-owner/products', label: 'Product Catalog', icon: Package },
            { path: '/sub-owner/inventory', label: 'Stock Inventory', icon: Layers },
            { path: '/sub-owner/customers', label: 'Customer Directory', icon: Users },
          ],
        },
      ];
    }

    if (isSeller || activeRole === 'seller') {
      return [
        {
          heading: 'Seller Portal',
          items: [
            { path: '/seller/dashboard', label: 'Overview', icon: LayoutDashboard },
            { path: '/seller/products', label: 'Products', icon: Package },
            { path: '/seller/orders', label: 'Orders', icon: ShoppingBag },
            { path: '/seller/payments', label: 'Payments', icon: CreditCard },
            { path: '/seller/profile', label: 'Artisan Profile', icon: Store },
          ],
        },
      ];
    }

    return [];
  };

  const navSections = getNavSections();

  const getPortalTitle = () => {
    if (activeRole === 'admin') return 'Admin Portal';
    if (isOwner || activeRole === 'owner') return 'Main Owner Portal';
    if (isSubOwner || activeRole === 'sub_owner') return 'Operations Management';
    if (isSeller || activeRole === 'seller') return 'Artisan Seller Hub';
    return 'CraftNest Portal';
  };

  return (
    <div className="h-screen w-full bg-[#FFF9F3] flex overflow-hidden">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation - Fixed to viewport */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 h-screen bg-white border-r border-[#E6D8CC] flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Brand Header - Fixed at top */}
        <div className="p-5 border-b border-[#E6D8CC] flex items-center justify-between shrink-0">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center text-[#A63D40]">
              <Sparkles className="w-5 h-5 text-[#A63D40]" />
            </div>
            <div>
              <span className="font-serif text-lg font-bold text-[#2B2523] block leading-tight">
                CRAFT<span className="text-[#A63D40]">NEST</span>
              </span>
              <span className="text-[10px] text-[#C69A5B] font-semibold uppercase tracking-wider block">
                {getPortalTitle()}
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-[#6F625D] hover:bg-[#F4E8DC]/50 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Profile Card - Fixed at top */}
        <div className="p-4 mx-3 my-3 bg-[#FFF9F3] rounded-xl border border-[#E6D8CC] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#A63D40] text-white flex items-center justify-center text-xs font-bold uppercase shrink-0">
              {(user?.name || user?.full_name || 'U').charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#2B2523] truncate">
                {user?.name || user?.full_name}
              </p>
              <div className="mt-0.5">
                <Badge status={activeRole} />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Sections - Independently scrollable if needed */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-6">
          {navSections.map((section, sIdx) => (
            <div key={sIdx}>
              {section.heading && (
                <p className="px-3 text-[10px] font-bold text-[#6F625D] uppercase tracking-wider mb-2">
                  {section.heading}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-[#A63D40] text-white font-semibold shadow-xs'
                          : 'text-[#2B2523] hover:bg-[#F4E8DC]/70'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#6F625D]'}`} />
                      <span className="flex-1">{item.label}</span>
                      {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                        <span
                          className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                            isActive
                              ? 'bg-white text-[#A63D40]'
                              : 'bg-[#A63D40] text-white shadow-xs'
                          }`}
                        >
                          {item.badgeCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer - Permanently pinned at bottom-left */}
        <div className="p-3 border-t border-[#E6D8CC] space-y-1 shrink-0 bg-white mt-auto">
          <Link
            to="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-[#2B2523] hover:bg-[#FFF9F3] transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-[#C69A5B]" />
              <span>View Storefront</span>
            </span>
            <ChevronRight className="w-3 h-3 text-[#6F625D]" />
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#B84242] hover:bg-rose-50 transition-colors cursor-pointer text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Right-Side Dashboard Pane (Offset by fixed sidebar on md+) */}
      <div className="flex-1 md:ml-64 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Header Bar - Fixed at top on mobile */}
        <div className="md:hidden shrink-0 flex items-center justify-between p-4 bg-white border-b border-[#E6D8CC] z-30">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#A63D40]" />
            <span className="font-serif font-bold text-lg text-[#2B2523]">
              CRAFT<span className="text-[#A63D40]">NEST</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg border border-[#E6D8CC] text-[#2B2523]"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Top Header - Fixed/Sticky at top of content */}
        <header className="shrink-0 bg-white border-b border-[#E6D8CC] px-6 py-5 z-20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-h-[32px]">
            <div>
              {title && <h1 className="font-serif text-2xl font-bold text-[#2B2523]">{title}</h1>}
              {subtitle && <p className="text-xs text-[#6F625D] mt-0.5">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              <span className="text-xs text-[#6F625D]">Signed in as:</span>
              <span className="text-xs font-bold text-[#2B2523]">{user?.name || user?.full_name}</span>
              <Badge status={activeRole} />
            </div>
          </div>
        </header>

        {/* Scrollable Main Content Area - Only right-side content scrolls */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
