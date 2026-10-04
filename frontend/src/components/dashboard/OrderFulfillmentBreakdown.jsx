import React from 'react';
import { ShoppingBag } from 'lucide-react';

const STATUS_CONFIG = {
  'Pending': {
    color: '#D97706',
    bgColor: '#FEF3C7',
    label: 'Pending'
  },
  'Confirmed': {
    color: '#0284C7',
    bgColor: '#E0F2FE',
    label: 'Confirmed'
  },
  'Packed': {
    color: '#6366F1',
    bgColor: '#EEF2FF',
    label: 'Packed'
  },
  'Shipped': {
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    label: 'Shipped'
  },
  'Out for Delivery': {
    color: '#EC4899',
    bgColor: '#FCE7F3',
    label: 'Out for Delivery'
  },
  'Delivered': {
    color: '#10B981',
    bgColor: '#D1FAE5',
    label: 'Delivered'
  },
  'Cancelled': {
    color: '#EF4444',
    bgColor: '#FEE2E2',
    label: 'Cancelled'
  }
};

const ORDERED_STATUSES = [
  'Pending',
  'Confirmed',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled'
];

export default function OrderFulfillmentBreakdown({
  breakdown = [],
  totalOrders = 0,
  loading = false,
  className = '',
  title = 'Order Fulfillment Status Breakdown',
  subtitle = 'Real-time distribution of patron orders across delivery milestones'
}) {
  // Map breakdown array into lookup by status
  const breakdownMap = (breakdown || []).reduce((acc, item) => {
    if (item && item.status) {
      acc[item.status] = item;
    }
    return acc;
  }, {});

  return (
    <div className={`bg-white rounded-2xl border border-[#E6D8CC] p-5 sm:p-6 craft-card-shadow flex flex-col justify-between ${className}`}>
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E6D8CC]">
          <div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#A63D40]" />
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#2B2523]">{title}</h2>
            </div>
            <p className="text-xs text-[#6F625D] mt-0.5">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FAF6F0] border border-[#E6D8CC] text-[#2B2523]">
              {totalOrders} {totalOrders === 1 ? 'Total Order' : 'Total Orders'}
            </span>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-[#E6D8CC]/60 bg-[#FAF6F0]/40 animate-pulse flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#E6D8CC]" />
                    <div className="space-y-1.5">
                      <div className="h-3 bg-[#E6D8CC] rounded w-20" />
                      <div className="h-2.5 bg-[#E6D8CC]/60 rounded w-12" />
                    </div>
                  </div>
                  <div className="h-4 bg-[#E6D8CC] rounded w-10" />
                </div>
              ))}
            </div>
            <div className="pt-2">
              <div className="h-3 bg-[#FAF6F0] rounded-full animate-pulse w-full border border-[#E6D8CC]/40" />
            </div>
          </div>
        ) : (
          <div className="pt-4 space-y-4">
            {/* Responsive Grid of Small Bordered Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ORDERED_STATUSES.map((st) => {
                const cfg = STATUS_CONFIG[st] || STATUS_CONFIG['Pending'];
                const item = breakdownMap[st];
                const count = item ? Number(item.count || 0) : 0;
                const pct = totalOrders > 0 ? (count / totalOrders) * 100 : 0;

                return (
                  <div
                    key={st}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#E6D8CC] bg-[#FFFDFC] hover:border-[#C69A5B]/60 hover:bg-[#FAF6F0]/50 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: cfg.color }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#2B2523] truncate leading-tight">
                          {st}
                        </div>
                        <div className="text-xs text-[#6F625D] mt-0.5">
                          <span className="font-bold text-[#2B2523]">{count}</span>{' '}
                          <span className="text-[11px] text-[#8C7E77]">
                            {count === 1 ? 'order' : 'orders'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <span
                        className="text-xs font-bold font-mono px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: cfg.bgColor, color: cfg.color }}
                      >
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* One Compact Horizontal Distribution Bar at the Bottom */}
            <div className="pt-3 border-t border-[#E6D8CC]/60 mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#6F625D]">
                <span>Fulfillment Distribution</span>
                <span>
                  {totalOrders > 0
                    ? `${totalOrders} ${totalOrders === 1 ? 'order' : 'orders'} (100%)`
                    : '0 orders (0%)'}
                </span>
              </div>

              <div className="h-3 w-full bg-[#FAF6F0] rounded-full overflow-hidden flex shadow-inner border border-[#E6D8CC]/60">
                {totalOrders > 0 ? (
                  ORDERED_STATUSES.map((st) => {
                    const item = breakdownMap[st];
                    const count = item ? Number(item.count || 0) : 0;
                    const pct = (count / totalOrders) * 100;
                    if (pct <= 0) return null;
                    const cfg = STATUS_CONFIG[st] || STATUS_CONFIG['Pending'];
                    return (
                      <div
                        key={st}
                        style={{ width: `${pct}%`, backgroundColor: cfg.color }}
                        className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full relative group"
                        title={`${st}: ${count} orders (${pct.toFixed(1)}%)`}
                      />
                    );
                  })
                ) : (
                  <div
                    className="h-full w-full bg-[#E6D8CC]/30 rounded-full"
                    title="No orders"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
