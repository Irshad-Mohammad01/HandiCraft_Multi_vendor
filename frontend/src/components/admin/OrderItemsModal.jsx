import React, { useState, useEffect } from 'react';
import { ShoppingBag, X, Package, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/env';

export const OrderItemsModal = ({
  isOpen,
  onClose,
  orderId,
  initialOrder = null
}) => {
  const [items, setItems] = useState([]);
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !orderId) {
      setItems([]);
      setOrderDetails(null);
      setError('');
      setLoading(false);
      return;
    }

    // Set initial fallback data from local order object if provided
    if (initialOrder) {
      setOrderDetails(initialOrder);
      if (Array.isArray(initialOrder.items) && initialOrder.items.length > 0) {
        setItems(initialOrder.items);
      }
    }

    // Always fetch latest order items from backend source of truth by unique Order ID
    const fetchOrderItems = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/admin/orders/${orderId}/items`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data && res.data.success) {
          setItems(res.data.items || []);
          setOrderDetails(res.data);
        } else if (res.data && res.data.items) {
          setItems(res.data.items);
          setOrderDetails(res.data);
        } else {
          setError(res.data?.message || 'Failed to retrieve order items.');
        }
      } catch (err) {
        console.error('Error fetching order items:', err);
        // Fallback to initial order items if available
        if (initialOrder && Array.isArray(initialOrder.items) && initialOrder.items.length > 0) {
          setItems(initialOrder.items);
          setOrderDetails(initialOrder);
        } else {
          setError(err.response?.data?.message || 'Unable to load items for this order. Please check network connection.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrderItems();
  }, [isOpen, orderId, initialOrder]);

  if (!isOpen) return null;

  const formatPrice = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  };

  const calculateGrandTotal = () => {
    if (orderDetails && orderDetails.total_amount !== undefined) {
      return parseFloat(orderDetails.total_amount);
    }
    return items.reduce((acc, item) => acc + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)), 0);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[85vh] shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#5B1E7A]/10 text-[#5B1E7A] dark:bg-[#D4A75F]/20 dark:text-[#D4A75F] rounded-2xl border border-[#5B1E7A]/20 dark:border-[#D4A75F]/30">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Purchased Order Items
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Order ID: <span className="font-mono text-[#5B1E7A] dark:text-[#D4A75F] font-bold">{orderId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-rose-500 cursor-pointer p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors bg-transparent border-none"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-left">
          
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 className="h-7 w-7 animate-spin text-[#5B1E7A] dark:text-[#D4A75F]" />
              <p className="text-xs font-semibold">Retrieving order items...</p>
            </div>
          ) : error && items.length === 0 ? (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 p-4 rounded-2xl text-xs font-semibold flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error Loading Order Items</p>
                <p className="mt-0.5 text-[11px] opacity-90">{error}</p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Package className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">No items found for this order.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, idx) => {
                const itemQty = parseInt(item.quantity) || 1;
                const itemPrice = parseFloat(item.price) || 0;
                const itemTotal = item.total_item_price !== undefined ? parseFloat(item.total_item_price) : itemPrice * itemQty;

                return (
                  <div 
                    key={item.id || idx}
                    className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-12 h-12 object-cover rounded-xl border border-slate-200 dark:border-slate-800 flex-shrink-0 bg-white"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 items-center justify-center flex-shrink-0 ${item.image ? 'hidden' : 'flex'}`}
                      >
                        <Package className="w-6 h-6" />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate leading-snug">
                          {item.name || 'Purchased Product'}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                          {item.product_id && (
                            <span className="font-mono bg-slate-200/60 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-300">
                              ID: {item.product_id}
                            </span>
                          )}
                          <span>Unit Price: ₹{formatPrice(itemPrice)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 space-y-1">
                      <span className="inline-block px-2 py-0.5 bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-[10px]">
                        Qty: {itemQty}
                      </span>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                        ₹{formatPrice(itemTotal)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer Summary */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-400 text-[11px] block">Total Order Items</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
          </div>

          <div className="text-right">
            <span className="text-slate-400 text-[11px] block">Order Grand Total</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
              ₹{formatPrice(calculateGrandTotal())}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OrderItemsModal;
