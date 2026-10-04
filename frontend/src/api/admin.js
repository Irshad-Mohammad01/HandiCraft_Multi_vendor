import apiClient from './client';

export const adminApi = {
  // Dashboard Overview Metrics
  async getStats() {
    const response = await apiClient.get('/admin/stats');
    return response.data;
  },

  // Users Management
  async getUsers(params = {}) {
    const response = await apiClient.get('/admin/users-complete', { params });
    return response.data;
  },

  async getSellers(params = {}) {
    const response = await apiClient.get('/admin/sellers', { params });
    return response.data;
  },

  async getSellerDetails(sellerId) {
    const response = await apiClient.get(`/admin/sellers/${sellerId}`);
    return response.data;
  },

  async toggleSellerStatus(sellerId, isBlocked) {
    const response = await apiClient.patch(`/admin/sellers/${sellerId}/status`, { is_blocked: isBlocked });
    return response.data;
  },

  async updateSeller(sellerId, data) {
    const response = await apiClient.put(`/admin/sellers/${sellerId}`, data);
    return response.data;
  },

  async createSeller(data) {
    const response = await apiClient.post('/admin/sellers', data);
    return response.data;
  },

  async getOwnerControl() {
    const response = await apiClient.get('/admin/owner-control');
    return response.data;
  },

  async createUser(data) {
    const response = await apiClient.post('/admin/users', data);
    return response.data;
  },

  async deleteUser(id) {
    const response = await apiClient.delete(`/admin/users/${id}`);
    return response.data;
  },

  async toggleBlockUser(id) {
    const response = await apiClient.put(`/admin/users/${id}/block`);
    return response.data;
  },

  // Categories Management
  async getCategories() {
    const response = await apiClient.get('/admin/categories');
    return response.data;
  },

  async createCategory(data) {
    const response = await apiClient.post('/admin/categories', data);
    return response.data;
  },

  async updateCategory(id, data) {
    const response = await apiClient.put(`/admin/categories/${id}`, data);
    return response.data;
  },

  async deleteCategory(id) {
    const response = await apiClient.delete(`/admin/categories/${id}`);
    return response.data;
  },

  // Payments & Financial Transactions
  async getPayments(params = {}) {
    const response = await apiClient.get('/admin/payments', { params });
    return response.data;
  },

  async getPaymentAnalytics() {
    const response = await apiClient.get('/admin/payments/analytics');
    return response.data;
  },

  // Audit Logs
  async getAuditLogs(params = {}) {
    const response = await apiClient.get('/admin/audit-logs', { params });
    return response.data;
  },

  // Site Settings
  async getSettings() {
    const response = await apiClient.get('/admin/settings');
    return response.data;
  },

  async updateSettings(data) {
    const response = await apiClient.post('/admin/settings', data);
    return response.data;
  },

  // Multi-Database Management (DB1, DB2, DB3...)
  async getDatabases() {
    const response = await apiClient.get('/admin/databases');
    return response.data;
  },

  async registerDatabase(data) {
    const response = await apiClient.post('/admin/databases/register', data);
    return response.data;
  },

  async verifyDatabase(databaseId) {
    const response = await apiClient.post(`/admin/databases/${databaseId}/verify`);
    return response.data;
  },

  async migrateDatabase(databaseId) {
    const response = await apiClient.post(`/admin/databases/${databaseId}/migrate`);
    return response.data;
  },

  async configureDatabase(databaseId, data) {
    const response = await apiClient.post(`/admin/databases/${databaseId}/configure`, data);
    return response.data;
  },

  // Orders Management
  async getOrders(params = {}) {
    const response = await apiClient.get('/orders/all', { params });
    return response.data;
  },

  async updateOrderStatus(id, data) {
    const response = await apiClient.put(`/orders/${id}/status`, data);
    return response.data;
  },

  async updateStatus(id, data) {
    return this.updateOrderStatus(id, data);
  },

  // Invoice Management
  async getInvoices(params = {}) {
    const response = await apiClient.get('/invoices/admin/all', { params });
    return response.data;
  },

  async downloadInvoicePdf(orderIdOrInvNum, invNumber = '') {
    const response = await apiClient.get(`/invoices/${orderIdOrInvNum}/pdf?download=true`, {
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CRAFTNEST-Invoice-${invNumber || orderIdOrInvNum}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async exportInvoicesCsv(params = {}) {
    const response = await apiClient.get('/invoices/admin/export', {
      params,
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `craftnest_invoices_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};

export default adminApi;

