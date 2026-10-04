import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import cartApi from '../api/cart';
import { useAuth } from './AuthContext';

export const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated, isOwner, isSeller, isSubOwner } = useAuth();
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('craftnest_wishlist');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const syncTimeoutRef = useRef(null);

  const isShoppingRestricted = isOwner || isSeller || isSubOwner;

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('craftnest_wishlist', JSON.stringify(Array.isArray(items) ? items : []));
    } catch (e) {
      console.error('Failed to save wishlist to localStorage:', e);
    }
  }, [items]);

  // Load wishlist from backend API for authenticated customers
  const loadWishlist = async () => {
    if (!isAuthenticated || isShoppingRestricted) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await cartApi.getWishlist();
      const rawList = res?.wishlist;
      if (Array.isArray(rawList)) {
        const formatted = rawList.map((product) => {
          const pId = String(product.id || product._id || product.product_id);
          const rawImages = product.images || (product.image ? [product.image] : []);
          let image = product.image_url || product.image || '';
          if (Array.isArray(rawImages) && rawImages.length > 0) {
            const first = rawImages[0];
            image = typeof first === 'string' ? first : (first?.image_url || image);
          }
          return {
            id: pId,
            product_id: pId,
            name: product.name || 'Handcrafted Treasure',
            price: Number(product.price || 0),
            discount: Number(product.discount || 0),
            image: image,
            image_url: image,
            category: product.category,
            stock: Number(product.stock !== undefined ? product.stock : 99),
            artisan_name: product.artisan_name || product.created_by || '',
          };
        });
        setItems(formatted);
      }
    } catch (err) {
      console.error('Failed to load wishlist from server:', err);
      if (err.response?.status !== 403) {
        setError(err.response?.data?.message || 'Failed to load saved handicrafts. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !isShoppingRestricted) {
      loadWishlist();
    }
  }, [isAuthenticated, isShoppingRestricted]);

  // Sync with backend API (only for customers)
  useEffect(() => {
    if (isAuthenticated && !isShoppingRestricted) {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        const payload = (Array.isArray(items) ? items : []).map((it) => ({
          product_id: it.id || it.product_id,
        }));
        cartApi.syncWishlist(payload).catch((err) => console.error('Wishlist sync error:', err));
      }, 800);
    }
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [items, isAuthenticated, isShoppingRestricted]);

  const isInWishlist = (productId) => {
    if (!productId) return false;
    const pId = String(productId);
    const list = Array.isArray(items) ? items : [];
    return list.some((it) => String(it.id || it.product_id) === pId);
  };

  const toggleWishlist = (product) => {
    if (!product) return;
    const pId = String(product.id || product._id);
    setItems((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const exists = list.some((it) => String(it.id || it.product_id) === pId);
      if (exists) {
        return list.filter((it) => String(it.id || it.product_id) !== pId);
      } else {
        const image = Array.isArray(product.images) && product.images.length > 0
          ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0]?.image_url)
          : product.image_url || product.image || '';

        return [
          ...list,
          {
            id: pId,
            product_id: pId,
            name: product.name,
            price: Number(product.price || 0),
            discount: Number(product.discount || 0),
            image: image,
            image_url: image,
            category: product.category,
            stock: Number(product.stock !== undefined ? product.stock : 99),
            artisan_name: product.artisan_name || product.created_by || '',
          },
        ];
      }
    });
  };

  const removeFromWishlist = (productId) => {
    if (!productId) return;
    const pId = String(productId);
    setItems((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      return list.filter((it) => String(it.id || it.product_id) !== pId);
    });
  };

  const safeList = Array.isArray(items) ? items : [];

  return (
    <WishlistContext.Provider
      value={{
        items: safeList,
        wishlist: safeList,
        wishlistItems: safeList,
        wishlistCount: safeList.length,
        loading,
        error,
        retry: loadWishlist,
        loadWishlist,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export default WishlistContext;
