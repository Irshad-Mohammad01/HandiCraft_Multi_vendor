import apiClient from './client';

export const couponsApi = {
  async validateCoupon(code, cartTotal) {
    const response = await apiClient.post('/coupons/validate', {
      code,
      total_amount: cartTotal,
      cart_total: cartTotal,
    });
    return response.data;
  },

  async getCoupons() {
    const response = await apiClient.get('/admin/coupons');
    return response.data;
  },

  async createCoupon(data) {
    const response = await apiClient.post('/admin/coupons', data);
    return response.data;
  },

  async updateCoupon(id, data) {
    const response = await apiClient.put(`/admin/coupons/${id}`, data);
    return response.data;
  },

  async toggleCoupon(id) {
    const response = await apiClient.patch(`/admin/coupons/${id}/toggle`);
    return response.data;
  },

  async deleteCoupon(id) {
    const response = await apiClient.delete(`/admin/coupons/${id}`);
    return response.data;
  },
};

export default couponsApi;
