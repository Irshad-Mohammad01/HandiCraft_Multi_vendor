import apiClient from './client';

export const bannersApi = {
  // Public active banners for homepage carousel or specific location
  async getBanners(params = {}) {
    const response = await apiClient.get('/banners', { params });
    return response.data;
  },

  // Admin banner management
  async getAllBanners(params = {}) {
    const response = await apiClient.get('/banners/all', { params });
    return response.data;
  },

  async createBanner(data) {
    const response = await apiClient.post('/banners', data);
    return response.data;
  },

  async updateBanner(id, data) {
    const response = await apiClient.put(`/banners/${id}`, data);
    return response.data;
  },

  async toggleBanner(id) {
    const response = await apiClient.patch(`/banners/${id}/toggle`);
    return response.data;
  },

  async deleteBanner(id) {
    const response = await apiClient.delete(`/banners/${id}`);
    return response.data;
  },

  async reorderBanners(orders) {
    const response = await apiClient.post('/banners/reorder', { orders });
    return response.data;
  },

  async uploadBannerImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiClient.post('/banners/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default bannersApi;

