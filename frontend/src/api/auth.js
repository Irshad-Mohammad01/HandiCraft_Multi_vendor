import apiClient from './client';

export const authApi = {
  // Common Single Login Endpoint for Owner, Sub Owner, Seller, and Customer
  async login(identifier, password) {
    const response = await apiClient.post('/auth/login', {
      email: identifier,
      password: password,
    });
    return response.data;
  },

  // Customer OTP-based Registration
  async sendRegistrationOtp(data) {
    const response = await apiClient.post('/auth/send-otp', data);
    return response.data;
  },

  async verifyRegistrationOtp(data) {
    const response = await apiClient.post('/auth/verify-otp', data);
    return response.data;
  },

  async resendRegistrationOtp(email) {
    const response = await apiClient.post('/auth/resend-otp', { email });
    return response.data;
  },

  // Password Recovery
  async forgotPassword(email) {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  async resendResetOtp(email) {
    const response = await apiClient.post('/auth/resend-reset-otp', { email });
    return response.data;
  },

  async verifyResetOtp(data) {
    const response = await apiClient.post('/auth/verify-reset-otp', data);
    return response.data;
  },

  async resetPassword(data) {
    const response = await apiClient.post('/auth/reset-password', data);
    return response.data;
  },

  // User Profile
  async getProfile() {
    const response = await apiClient.get('/auth/profile');
    return response.data;
  },

  async updateProfile(data) {
    const response = await apiClient.put('/auth/profile', data);
    return response.data;
  },

  // Saved Addresses
  async getAddresses() {
    const response = await apiClient.get('/auth/addresses');
    return response.data;
  },

  async addAddress(data) {
    const response = await apiClient.post('/auth/addresses', data);
    return response.data;
  },

  async updateAddress(id, data) {
    const response = await apiClient.put(`/auth/addresses/${id}`, data);
    return response.data;
  },

  async deleteAddress(id) {
    const response = await apiClient.delete(`/auth/addresses/${id}`);
    return response.data;
  },

  async setDefaultAddress(id) {
    const response = await apiClient.put(`/auth/addresses/${id}/default`);
    return response.data;
  },

  // Logout
  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors during logout
    }
    localStorage.removeItem('token');
    localStorage.removeItem('bb_token');
    localStorage.removeItem('user');
    localStorage.removeItem('bb_user');
    localStorage.removeItem('bb_login_type');
  },
};

export default authApi;
