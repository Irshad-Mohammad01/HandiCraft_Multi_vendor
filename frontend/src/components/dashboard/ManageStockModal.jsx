import React, { useState, useEffect } from 'react';
import { 
  X, AlertTriangle, Package, Check, 
  ExternalLink, Layers, DollarSign 
} from 'lucide-react';
import { productsApi } from '../../api/products';
import Button from '../common/Button';

export default function ManageStockModal({
  product = null,
  isOpen = false,
  onClose,
  onStockUpdated,
  role = 'owner'
}) {
  const [stockInput, setStockInput] = useState('');
  const [mode, setMode] = useState('set'); // 'set', 'increase', 'decrease'
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (product) {
      setStockInput(String(product.stock !== undefined ? product.stock : 0));
      setMode('set');
      setReason('');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const currentStock = parseInt(product.stock || 0, 10);
  const isOutOfStock = currentStock === 0;

  const handleUpdate = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSaving(true);

    const val = parseInt(stockInput, 10);
    if (isNaN(val) || val < 0) {
      setErrorMsg('Please enter a valid non-negative stock count.');
      setSaving(false);
      return;
    }

    try {
      let finalStock = val;
      if (mode === 'increase') {
        finalStock = currentStock + val;
      } else if (mode === 'decrease') {
        if (currentStock - val < 0) {
          setErrorMsg(`Cannot reduce by ${val} units. Current available stock is ${currentStock}.`);
          setSaving(false);
          return;
        }
        finalStock = currentStock - val;
      }

      // Use adjustStock or update
      let res;
      try {
        res = await productsApi.adjustStock(product.id, {
          action: mode === 'set' ? 'set' : (mode === 'increase' ? 'increase' : 'decrease'),
          value: val,
          reason: reason || 'Dashboard inventory management adjustment'
        });
      } catch (stockErr) {
        // Fallback to updateProduct if adjustStock is not applicable
        res = await productsApi.update(product.id, {
          stock: finalStock
        });
      }

      const updatedProd = {
        ...product,
        stock: finalStock
      };

      setSuccessMsg(`Stock updated successfully to ${finalStock} units!`);
      if (onStockUpdated) {
        onStockUpdated(updatedProd);
      }

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to update product stock:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update stock. Verify permissions.');
    } finally {
      setSaving(false);
    }
  };

  const editLink = role === 'seller' ? `/seller/products` : `/owner/products`;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-3xl border border-[#E6D8CC] craft-card-shadow max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E6D8CC] bg-[#FAF6F0]">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#A63D40]" />
            <h3 className="font-serif text-lg font-bold text-[#2B2523]">Manage Inventory Stock</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#6F625D] hover:text-[#2B2523] hover:bg-[#E6D8CC]/40 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Product Preview Card */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#FFF9F3] border border-[#E6D8CC]/60">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-14 h-14 rounded-xl object-cover border border-[#E6D8CC] shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-white border border-[#E6D8CC] flex items-center justify-center text-[#A63D40] shrink-0">
                <Package className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="font-serif font-bold text-sm text-[#2B2523] truncate">{product.name}</h4>
              <p className="text-xs text-[#6F625D]">
                {product.category || 'Handicrafts'} &middot; ₹{Number(product.price || 0).toLocaleString('en-IN')}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  isOutOfStock 
                    ? 'bg-rose-100 text-[#B84242] border border-rose-200' 
                    : 'bg-amber-100 text-[#D97706] border border-amber-200'
                }`}>
                  {isOutOfStock ? 'Out of Stock' : `${currentStock} units left`}
                </span>
                {product.seller_name && (
                  <span className="text-[10px] text-[#6F625D] truncate">
                    By {product.seller_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-[#B84242] flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-[#3F7D5A] flex items-center gap-2">
              <Check size={15} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleUpdate} className="space-y-4">
            {/* Mode Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#6F625D] uppercase tracking-wider mb-1.5">
                Adjustment Action
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => { setMode('set'); setStockInput(String(currentStock)); }}
                  className={`py-2 px-3 rounded-xl border text-center transition-all ${
                    mode === 'set'
                      ? 'bg-[#A63D40] text-white border-[#A63D40] shadow-sm'
                      : 'bg-white text-[#2B2523] border-[#E6D8CC] hover:bg-[#FAF6F0]'
                  }`}
                >
                  Set Total
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('increase'); setStockInput('10'); }}
                  className={`py-2 px-3 rounded-xl border text-center transition-all ${
                    mode === 'increase'
                      ? 'bg-[#3F7D5A] text-white border-[#3F7D5A] shadow-sm'
                      : 'bg-white text-[#2B2523] border-[#E6D8CC] hover:bg-[#FAF6F0]'
                  }`}
                >
                  + Add Units
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('decrease'); setStockInput('1'); }}
                  className={`py-2 px-3 rounded-xl border text-center transition-all ${
                    mode === 'decrease'
                      ? 'bg-[#D97706] text-white border-[#D97706] shadow-sm'
                      : 'bg-white text-[#2B2523] border-[#E6D8CC] hover:bg-[#FAF6F0]'
                  }`}
                >
                  - Reduce Units
                </button>
              </div>
            </div>

            {/* Input Value */}
            <div>
              <label className="block text-xs font-semibold text-[#6F625D] uppercase tracking-wider mb-1">
                {mode === 'set' ? 'New Available Stock Units' : (mode === 'increase' ? 'Units to Add' : 'Units to Reduce')}
              </label>
              <input
                type="number"
                min="0"
                value={stockInput}
                onChange={(e) => setStockInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6D8CC] bg-[#FFF9F3]/40 text-[#2B2523] font-bold text-sm focus:outline-none focus:border-[#A63D40]"
                required
              />
              <p className="text-[11px] text-[#6F625D] mt-1">
                {mode === 'set' && `Setting stock to ${stockInput || 0} units. Setting > 10 units removes this warning.`}
                {mode === 'increase' && `Resulting stock will be: ${currentStock + (parseInt(stockInput, 10) || 0)} units.`}
                {mode === 'decrease' && `Resulting stock will be: ${Math.max(0, currentStock - (parseInt(stockInput, 10) || 0))} units.`}
              </p>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-[#6F625D] uppercase tracking-wider mb-1">
                Reason / Batch Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. New artisan batch received from Jaipur workshop"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6D8CC] bg-[#FFF9F3]/40 text-[#2B2523] focus:outline-none focus:border-[#A63D40]"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#E6D8CC]">
              <a
                href={editLink}
                className="text-xs font-semibold text-[#A63D40] hover:underline flex items-center gap-1"
              >
                <span>Full Product Catalog</span>
                <ExternalLink size={12} />
              </a>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={saving}>
                  Save Stock
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
