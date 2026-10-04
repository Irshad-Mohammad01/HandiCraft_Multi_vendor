import apiClient from './client';

export const cartApi = {
  async syncCart(cart) {
    const response = await apiClient.post('/auth/cart', { cart });
    return response.data;
  },

  async getWishlist() {
    const response = await apiClient.get('/auth/wishlist');
    return response.data;
  },

  async syncWishlist(wishlist) {
    const response = await apiClient.post('/auth/wishlist', { wishlist });
    return response.data;
  },
};

export default cartApi;
