import apiClient from './client';

export const notificationsApi = {
  // Fetch customer notifications
  async getNotifications(params = {}) {
    const response = await apiClient.get('/auth/notifications', { params });
    return response.data;
  },

  // Mark single notification as read
  async markAsRead(notificationId) {
    const response = await apiClient.put(`/auth/notifications/${notificationId}/read`);
    return response.data;
  },

  // Mark all notifications as read
  async markAllAsRead() {
    const response = await apiClient.put('/auth/notifications/read-all');
    return response.data;
  },

  // Clear read notifications
  async clearRead() {
    const response = await apiClient.delete('/auth/notifications/clear-read');
    return response.data;
  },
};

export default notificationsApi;
