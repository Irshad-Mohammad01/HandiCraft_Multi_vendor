import React from 'react';
import { Layers, DollarSign, Package, AlertCircle } from 'lucide-react';

const CATEGORY_PALETTE = [
  '#A63D40', // Terracotta
  '#C69A5B', // Heritage Brass / Gold
  '#3F7D5A', // Forest Jade
  '#0284C7', // Sky Blue
  '#8B5CF6', // Royal Amethyst
  '#E07A5F', // Warm Rust
  '#0D9488', // Teal
  '#D97706', // Warm Amber
  '#4F46E5', // Deep Indigo
  '#64748B', // Slate
];

export default function CategoryStockDistribution({
  categories = [],
  totalStockValue = 0,
  totalProducts = 0,
  totalStockUnits = 0,
  loading = false,
  className = '',
  title = 'Category Stock Value Distribution',
  subtitle = 'Total inventory valuation by craft categories (Product Price × Available Stock Quantity)'
}) {
  return (
    <div className={`bg-white rounded-2xl border border-[#E6D8CC] p-5 sm:p-6 craft-card-shadow flex flex-col justify-between ${className}`}>
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E6D8CC]">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#C69A5B]" />
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#2B2523]">{title}</h2>
            </div>
            <p className="text-xs text-[#6F625D] mt-0.5">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FAF6F0] border border-[#E6D8CC] text-[#A63D40]">
              ₹{Number(totalStockValue || 0).toLocaleString('en-IN')} Total Value
            </span>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-12 space-y-4">
            <div className="h-4 bg-[#FAF6F0] rounded-full animate-pulse w-full" />
            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4 animate-pulse">
                  <div className="h-4 bg-[#FAF6F0] rounded w-32" />
                  <div className="h-3 bg-[#FAF6F0] rounded-full w-36" />
                  <div className="h-4 bg-[#FAF6F0] rounded w-20" />
                </div>
              ))}
            </div>
          </div>
        ) : (!categories || categories.length === 0) ? (
          /* Empty State */
          <div className="py-12 px-4 text-center">
            <Package className="w-10 h-10 text-[#E6D8CC] mx-auto mb-2" />
            <p className="font-serif text-base font-bold text-[#2B2523]">No inventory recorded yet</p>
            <p className="text-xs text-[#6F625D] max-w-sm mx-auto mt-1">
              Add craft products with pricing and stock quantities to visualize category valuations.
            </p>
          </div>
        ) : (
          <div className="pt-4 space-y-5">
            {/* Multi-segmented Composite Overview Bar */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#6F625D] mb-1.5">
                <span>Category Valuation Distribution</span>
                <span>{categories.length} {categories.length === 1 ? 'Category' : 'Categories'}</span>
              </div>
              <div className="h-3.5 w-full bg-[#FAF6F0] rounded-full overflow-hidden flex shadow-inner border border-[#E6D8CC]/40">
                {categories.map((cat, idx) => {
                  const pct = cat.percentage || 0;
                  if (pct <= 0) return null;
                  const color = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
                  return (
                    <div
                      key={cat.category_name || idx}
                      style={{ width: `${pct}%`, backgroundColor: color }}
                      className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                      title={`${cat.category_name}: ₹${Number(cat.stock_value || 0).toLocaleString('en-IN')} (${pct}%)`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Individual Category Breakdown Rows */}
            <div className="space-y-3 pt-1 max-h-[380px] overflow-y-auto pr-1">
              {categories.map((cat, idx) => {
                const color = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
                const pct = cat.percentage || 0;

                return (
                  <div
                    key={cat.category_name || idx}
                    className="p-2.5 rounded-xl hover:bg-[#FFF9F3]/60 transition-colors border border-transparent hover:border-[#E6D8CC]/60"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-semibold text-[#2B2523] truncate">
                          {cat.category_name || 'Uncategorized'}
                        </span>
                        <span className="text-[11px] text-[#6F625D] shrink-0 font-normal">
                          ({cat.products_count} {cat.products_count === 1 ? 'product' : 'products'})
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-[#2B2523]">
                          ₹{Number(cat.stock_value || 0).toLocaleString('en-IN')}
                        </span>
                        <span
                          className="font-mono font-bold text-[11px] px-2 py-0.5 rounded-md text-white shrink-0"
                          style={{ backgroundColor: color }}
                        >
                          {Number(pct).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar for this category */}
                    <div className="h-2 w-full bg-[#FAF6F0] rounded-full overflow-hidden border border-[#E6D8CC]/40">
                      <div
                        style={{ width: `${pct}%`, backgroundColor: color }}
                        className="h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Summary */}
      {categories.length > 0 && !loading && (
        <div className="pt-4 mt-2 border-t border-[#E6D8CC]/60 flex items-center justify-between text-xs text-[#6F625D]">
          <span>Total Inventory Units: <strong>{totalStockUnits} units</strong></span>
          <span>Catalog Products: <strong>{totalProducts} items</strong></span>
        </div>
      )}
    </div>
  );
}
