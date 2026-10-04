import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Heart, ShoppingBag, User } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';

export const MobileBottomNav = () => {
  const location = useLocation();
  const { totalItemsCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { isAuthenticated, isOwner, isSubOwner, isSeller } = useAuth();

  // Hide on dashboard or specific checkout flows if needed
  const isDashboardRoute =
    location.pathname.startsWith('/owner') ||
    location.pathname.startsWith('/sub-owner') ||
    location.pathname.startsWith('/seller');

  if (isDashboardRoute) return null;

  // Account target path
  let accountPath = '/login';
  if (isAuthenticated) {
    if (isOwner) accountPath = '/owner/dashboard';
    else if (isSubOwner) accountPath = '/sub-owner/dashboard';
    else if (isSeller) accountPath = '/seller/dashboard';
    else accountPath = '/account';
  }

  const canShop = !isOwner && !isSeller && !isSubOwner;

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'All Crafts', path: '/products', icon: Compass },
    ...(canShop ? [
      { label: 'Wishlist', path: '/wishlist', icon: Heart, badge: wishlistCount },
      { label: 'Cart', path: '/cart', icon: ShoppingBag, badge: totalItemsCount },
    ] : []),
    { label: 'Account', path: accountPath, icon: User },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E6D8CC] shadow-lg transition-transform"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}
    >
      <div
        className="grid h-14"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.label}
              to={item.path}
              className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-[#A63D40] font-bold'
                  : 'text-[#6F625D] hover:text-[#2B2523]'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-[#A63D40] text-white text-[9px] font-bold min-w-[15px] h-[15px] px-0.5 rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="truncate max-w-[54px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
