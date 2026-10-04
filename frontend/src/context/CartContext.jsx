import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import cartApi from '../api/cart';
import couponsApi from '../api/coupons';
import { useAuth } from './AuthContext';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { isAuthenticated, user, isOwner, isSeller, isSubOwner } = useAuth();
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('craftnest_cart');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const syncTimeoutRef = useRef(null);

  const isShoppingRestricted = isOwner || isSeller || isSubOwner;

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('craftnest_cart', JSON.stringify(Array.isArray(items) ? items : []));
    } catch (e) {
      console.error('Failed to save cart to localStorage:', e);
    }
  }, [items]);

  // Sync with backend API when authenticated customer
  useEffect(() => {
    if (isAuthenticated && !isShoppingRestricted) {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        const payload = (Array.isArray(items) ? items : []).map((it) => ({
          product_id: it.id || it.product_id,
          quantity: it.quantity,
          saved_for_later: false,
        }));
        cartApi.syncCart(payload).catch((err) => console.error('Cart sync error:', err));
      }, 800);
    }
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [items, isAuthenticated, isShoppingRestricted]);

  const addToCart = (product, quantity = 1) => {
    setItems((prev) => {
      const productId = String(product.id || product._id);
      const existingIndex = prev.findIndex(
        (it) => String(it.id || it.product_id) === productId
      );

      const effectivePrice =
        product.discount > 0
          ? Number(product.price) * (1 - Number(product.discount) / 100)
          : Number(product.price);

      const image = Array.isArray(product.images) && product.images.length > 0
        ? product.images[0]
        : product.image || '';

      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + quantity;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: product.stock ? Math.min(newQty, product.stock) : newQty,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            id: productId,
            product_id: productId,
            name: product.name,
            price: Number(product.price),
            effectivePrice: Math.round(effectivePrice),
            discount: Number(product.discount || 0),
            quantity: Math.max(1, quantity),
            image: image,
            stock: Number(product.stock || 99),
          },
        ];
      }
    });
  };

  const updateQuantity = (productId, quantity) => {
    const pId = String(productId);
    if (quantity <= 0) {
      removeFromCart(pId);
      return;
    }
    setItems((prev) =>
      prev.map((it) => {
        if (String(it.id || it.product_id) === pId) {
          const maxStock = it.stock || 99;
          return { ...it, quantity: Math.min(quantity, maxStock) };
        }
        return it;
      })
    );
  };

  const removeFromCart = (productId) => {
    const pId = String(productId);
    setItems((prev) => prev.filter((it) => String(it.id || it.product_id) !== pId));
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
    localStorage.removeItem('craftnest_cart');
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.effectivePrice || item.price) * item.quantity, 0);
  }, [items]);

  const discount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discount_type === 'percent') {
      return Math.round((subtotal * appliedCoupon.discount_value) / 100);
    }
    return Math.min(appliedCoupon.discount_value, subtotal);
  }, [subtotal, appliedCoupon]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discount);
  }, [subtotal, discount]);

  const totalItemsCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  // Apply Coupon with Real Backend API
  const applyCoupon = async (code) => {
    try {
      const result = await couponsApi.validateCoupon(code, subtotal);
      if (result.valid) {
        setAppliedCoupon({
          code: result.coupon.code,
          discount_type: result.coupon.discount_type,
          discount_value: result.coupon.discount_value,
          discount_amount: result.discount_amount,
        });
        return { success: true, message: result.message || 'Coupon applied successfully!' };
      } else {
        return { success: false, message: result.message || 'Invalid coupon code.' };
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to validate coupon code.';
      return { success: false, message: msg };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const getSubtotal = () => subtotal;

  return (
    <CartContext.Provider
      value={{
        items,
        cartItems: items,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        subtotal,
        getSubtotal,
        discount,
        total,
        totalItemsCount,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
