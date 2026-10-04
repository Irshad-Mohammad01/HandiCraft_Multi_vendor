import apiClient from './client';

export const ordersApi = {
  // Customer creates order
  async createOrder(data, headers = {}) {
    const response = await apiClient.post('/orders', data, { headers });
    return response.data;
  },
  async create(data, headers = {}) {
    return this.createOrder(data, headers);
  },

  // Payment Routing & Gateway Verification
  async createPaymentOrder(orderId) {
    const response = await apiClient.post('/orders/create-payment-order', { order_id: orderId });
    return response.data;
  },

  async verifyPayment(paymentPayload) {
    const response = await apiClient.post('/orders/verify-payment', paymentPayload);
    return response.data;
  },

  // Customer / Seller retrieves their orders
  async getUserOrders(params = {}) {
    const response = await apiClient.get('/orders', { params });
    return response.data;
  },

  // Alias for generic retrieval (backend routes based on authenticated role)
  async getAll(params = {}) {
    const response = await apiClient.get('/orders', { params });
    return response.data;
  },

  async getSellerOrders(params = {}) {
    const response = await apiClient.get('/orders/seller', { params });
    return response.data;
  },

  async getSellerPayments(params = {}) {
    const response = await apiClient.get('/orders/seller-payments', { params });
    return response.data;
  },

  // Real-time fulfillment status breakdown (7 canonical milestones)
  async getFulfillmentStats() {
    const response = await apiClient.get('/orders/fulfillment-stats');
    return response.data;
  },

  async getById(id) {
    const response = await apiClient.get(`/orders/${id}`);
    return response.data;
  },

  // Admin / Sub Owner retrieves all orders across platform
  async getAllOrders(params = {}) {
    const response = await apiClient.get('/orders/all', { params });
    return response.data;
  },

  // Update order status & tracking info
  async updateOrderStatus(id, data) {
    const response = await apiClient.put(`/orders/${id}/status`, data);
    return response.data;
  },

  async updateStatus(id, data) {
    return this.updateOrderStatus(id, data);
  },

  async updateTracking(id, data) {
    const response = await apiClient.put(`/orders/${id}/tracking`, data);
    return response.data;
  },

  // Customer requests return
  // Cancel order
  async cancel(orderId) {
    const response = await apiClient.put(`/orders/${orderId}/status`, { status: 'Cancelled' });
    return response.data;
  },

  // Invoice API methods
  async getInvoice(orderId) {
    const response = await apiClient.get(`/orders/${orderId}/invoice`);
    return response.data;
  },

  async downloadInvoicePdf(orderId, invoiceNumber = '') {
    const response = await apiClient.get(`/orders/${orderId}/invoice/pdf?download=true`, {
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CRAFTNEST-Invoice-${invoiceNumber || orderId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async viewInvoicePdf(orderId) {
    const response = await apiClient.get(`/orders/${orderId}/invoice/pdf`, {
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
};

export default ordersApi;
