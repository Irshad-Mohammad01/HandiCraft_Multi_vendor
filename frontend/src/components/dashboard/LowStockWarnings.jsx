import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, AlertCircle, CheckCircle2, 
  Package, Sliders, ArrowUpRight 
} from 'lucide-react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import ManageStockModal from './ManageStockModal';

export default function LowStockWarnings({
  products = [],
  loading = false,
  role = 'owner',
  onStockUpdated,
  className = '',
  title = 'Low Stock Warnings',
  subtitle = 'Real-time alerts for handicrafts with low stock (1–10 units) or out of stock (0 units)'
}) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter to strictly stock <= 10 (precaution in case unfiltered products are passed)
  const alertProducts = (products || []).filter(
    (p) => p && p.stock !== undefined && parseInt(p.stock, 10) <= 10
  );

  const outOfStockCount = alertProducts.filter(p => parseInt(p.stock, 10) === 0).length;
  const lowStockCount = alertProducts.filter(p => {
    const s = parseInt(p.stock, 10);
    return s > 0 && s <= 10;
  }).length;

  const handleOpenManage = (prod) => {
    setSelectedProduct(prod);
    setIsModalOpen(true);
  };

  const handleStockUpdateSuccess = (updatedProd) => {
    if (onStockUpdated) {
      onStockUpdated(updatedProd);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border border-[#E6D8CC] craft-card-shadow overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-[#E6D8CC] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#B84242]" />
            <h2 className="font-serif text-lg sm:text-xl font-bold text-[#2B2523]">{title}</h2>
          </div>
          <p className="text-xs text-[#6F625D] mt-0.5">{subtitle}</p>
        </div>

        {/* Status Counts Summary Pills */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {outOfStockCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 border border-rose-200 text-[#B84242]">
              <span className="w-2 h-2 rounded-full bg-[#B84242]" />
              <span>{outOfStockCount} Out of Stock</span>
            </span>
          )}
          {lowStockCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-[#D97706]">
              <span className="w-2 h-2 rounded-full bg-[#D97706]" />
              <span>{lowStockCount} Low Stock</span>
            </span>
          )}
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FAF6F0] border border-[#E6D8CC] text-[#2B2523]">
            {alertProducts.length} Total Alerts
          </span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-10 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-[#FAF6F0] animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#E6D8CC]/60" />
                <div className="space-y-1.5">
                  <div className="w-36 h-4 bg-[#E6D8CC]/60 rounded" />
                  <div className="w-24 h-3 bg-[#E6D8CC]/40 rounded" />
                </div>
              </div>
              <div className="w-24 h-8 bg-[#E6D8CC]/60 rounded-xl" />
            </div>
          ))}
        </div>
      ) : alertProducts.length === 0 ? (
        /* Empty State: All stock healthy */
        <div className="p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#3F7D5A] mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="font-serif text-lg font-bold text-[#2B2523] mb-1">
            Healthy Inventory Levels
          </h3>
          <p className="text-xs text-[#6F625D] max-w-md mx-auto">
            All handcrafted items have more than 10 units in stock. No items currently require low-stock or replenishment warnings.
          </p>
        </div>
      ) : (
        /* Responsive Table of Low Stock Items */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAF6F0] border-b border-[#E6D8CC] text-[#2B2523] font-semibold">
                <th className="py-3.5 px-4 sm:px-6">Product</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-center">Available Stock</th>
                <th className="py-3.5 px-4">Warning Badge</th>
                {role === 'owner' && <th className="py-3.5 px-4">Artisan / Seller</th>}
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6D8CC]/60">
              {alertProducts.map((p) => {
                const stockNum = parseInt(p.stock || 0, 10);
                const isZero = stockNum === 0;

                return (
                  <tr key={p.id || p._id} className="hover:bg-[#FFF9F3]/60 transition-colors">
                    {/* Product Image & Name */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3 min-w-0 max-w-xs sm:max-w-md">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-11 h-11 rounded-xl object-cover border border-[#E6D8CC] shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-[#FFF9F3] border border-[#E6D8CC] flex items-center justify-center text-[#A63D40] shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link
                            to={`/products/${p.id || p._id}`}
                            className="font-bold text-[#2B2523] hover:text-[#A63D40] transition-colors truncate block"
                            title={p.name}
                          >
                            {p.name}
                          </Link>
                          <span className="text-[11px] text-[#6F625D]">
                            ₹{Number(p.price || 0).toLocaleString('en-IN')} &middot; #{p.id || p._id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-[#FAF6F0] border border-[#E6D8CC] text-[11px] font-medium text-[#2B2523]">
                        {p.category || 'Handicrafts'}
                      </span>
                    </td>

                    {/* Available Stock */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block font-mono text-sm font-bold ${
                          isZero ? 'text-[#B84242]' : 'text-[#D97706]'
                        }`}
                      >
                        {stockNum} {stockNum === 1 ? 'unit' : 'units'}
                      </span>
                    </td>

                    {/* Warning Badge */}
                    <td className="py-3.5 px-4">
                      {isZero ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-[#B84242] border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#B84242]" />
                          <span>Out of Stock</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-[#D97706] border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                          <span>Low Stock ({stockNum} left)</span>
                        </span>
                      )}
                    </td>

                    {/* Seller Name (Admin View Only) */}
                    {role === 'owner' && (
                      <td className="py-3.5 px-4 text-[#6F625D]">
                        <span className="text-xs font-medium text-[#2B2523] block truncate max-w-[140px]">
                          {p.seller_name || 'Main Owner'}
                        </span>
                      </td>
                    )}

                    {/* Manage Product Button */}
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      {p.can_manage !== false ? (
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Sliders}
                          onClick={() => handleOpenManage(p)}
                          className="hover:border-[#A63D40] hover:text-[#A63D40]"
                        >
                          Manage Product
                        </Button>
                      ) : (
                        <span className="text-[11px] text-[#6F625D] italic">
                          Restricted
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Interactive Stock Management Modal */}
      <ManageStockModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStockUpdated={handleStockUpdateSuccess}
        role={role}
      />
    </div>
  );
}
