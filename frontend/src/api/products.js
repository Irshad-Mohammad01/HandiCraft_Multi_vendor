import apiClient from './client';

export const productsApi = {
  // Fetch products with optional filters (category, search, seller, all, page, limit)
  async getProducts(params = {}) {
    const response = await apiClient.get('/products', { params });
    return response.data;
  },

  async getAll(params = {}) {
    return this.getProducts(params);
  },

  // Fetch all categories
  async getCategories() {
    const response = await apiClient.get('/products/categories');
    return response.data;
  },

  // Category Stock Value Distribution (Price * Stock)
  async getCategoryStockDistribution() {
    const response = await apiClient.get('/products/category-stock-distribution');
    return response.data;
  },

  // Low Stock Warnings (Stock <= 10)
  async getLowStockWarnings() {
    const response = await apiClient.get('/products/low-stock-warnings');
    return response.data;
  },

  // Fetch single product by ID
  async getProductById(id) {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },

  async getById(id) {
    return this.getProductById(id);
  },

  // Create new product (Owner / Seller)
  async createProduct(data) {
    const response = await apiClient.post('/products', data);
    return response.data;
  },

  async create(data) {
    return this.createProduct(data);
  },

  // Update existing product
  async updateProduct(id, data) {
    const response = await apiClient.put(`/products/${id}`, data);
    return response.data;
  },

  async update(id, data) {
    return this.updateProduct(id, data);
  },

  // Delete product (Owner / Seller for own product)
  async deleteProduct(id) {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  },
  async delete(id) {
    return this.deleteProduct(id);
  },

  // Dedicated Product Management detail for Owner & Seller (with RBAC)
  async getManagementDetails(id) {
    const response = await apiClient.get(`/products/${id}/management`);
    return response.data;
  },

  // Stock History with pagination
  async getStockHistory(id, params = {}) {
    const response = await apiClient.get(`/products/${id}/stock-history`, { params });
    return response.data;
  },

  // Product Audit Logs with pagination
  async getAuditLogs(id, params = {}) {
    const response = await apiClient.get(`/products/${id}/logs`, { params });
    return response.data;
  },

  // Stock Management (increase, decrease, set with reason)
  async adjustStock(id, { action, value, reason }) {
    const response = await apiClient.put(`/products/${id}/stock`, { action, value, reason });
    return response.data;
  },

  // Delete product (Owner)
  async deleteProduct(id) {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  },

  async delete(id) {
    return this.deleteProduct(id);
  },

  // Update product stock inventory legacy alias
  async updateStock(id, stock) {
    const response = await apiClient.put(`/admin/products/${id}/stock`, { stock });
    return response.data;
  },

  // Category management aliases
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

  // Submit customer review
  async addReview(productId, reviewData) {
    const response = await apiClient.post(`/products/${productId}/review`, reviewData);
    return response.data;
  },

  // Upload image
  async uploadImage(formData) {
    const response = await apiClient.post('/products/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default productsApi;
