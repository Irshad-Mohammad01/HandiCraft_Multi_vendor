import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  Users,
  Store,
  BarChart3,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

export const AdminOwnerBar = ({ activeTab = 'products', onTabChange = null }) => {
  const navigate = useNavigate();

  const tabs = [
    {
      id: 'products',
      label: 'All Products',
      path: '/?tab=products',
      icon: Package,
    },
    {
      id: 'users',
      label: 'Users Data',
      path: '/?tab=users',
      icon: Users,
    },
    {
      id: 'sellers',
      label: 'Sellers Data',
      path: '/?tab=sellers',
      icon: Store,
    },
    {
      id: 'analytics',
      label: 'Admin Analytics',
      path: '/?tab=analytics',
      icon: BarChart3,
    },
  ];

  const handleTabClick = (tab) => {
    if (onTabChange) {
      onTabChange(tab.id);
    } else {
      navigate(tab.path);
    }
  };

  return (
    <div className="w-full bg-white border border-[#E6D8CC] rounded-2xl p-3 sm:p-4 shadow-sm my-6 sm:my-8 transition-all">
      {/* Top Tag & Context Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E6D8CC]/80">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#A63D40] animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#A63D40]">
            ADMIN / OWNER AREA
          </span>
          <span className="hidden sm:inline-block text-[11px] text-[#6F625D]">
            • Centralized Marketplace Management
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#6F625D]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#3F7D5A]" />
          <span>Authenticated Main Owner</span>
        </div>
      </div>

      {/* Responsive Horizontal Layout: 4 Tabs on Left, Admin Control on Right */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
        {/* Navigation Tabs (Horizontally scrollable on mobile without shrinking text) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin flex-nowrap min-w-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`admin-tab-${tab.id}`}
                onClick={() => handleTabClick(tab)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#A63D40] text-white shadow-xs'
                    : 'bg-[#FFF9F3] text-[#2B2523] border border-[#E6D8CC] hover:bg-[#F4E8DC] hover:text-[#A63D40]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#FFF9F3]' : 'text-[#6F625D]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Action: Admin Control Navigation Button */}
        <div className="flex items-center justify-end shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#E6D8CC]/50">
          <Link
            to="/owner/control"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2B2523] text-[#FFF9F3] hover:bg-[#A63D40] text-xs sm:text-sm font-semibold shadow-xs transition-colors group cursor-pointer"
          >
            <span>Admin Control</span>
            <ArrowRight className="w-4 h-4 text-[#C69A5B] group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminOwnerBar;
