import axios from 'axios';
import { API_BASE_URL } from '../config/api';

export { API_BASE_URL };

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Inject JWT Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || localStorage.getItem('bb_token');
    if (token && token !== 'null' && token !== 'undefined') {
      const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
      if (cleanToken.length > 10) {
        config.headers.Authorization = `Bearer ${cleanToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Global 401 & Error Processing
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      const hadToken = !!(localStorage.getItem('token') || localStorage.getItem('bb_token'));
      localStorage.removeItem('token');
      localStorage.removeItem('bb_token');
      localStorage.removeItem('user');
      localStorage.removeItem('bb_user');
      delete apiClient.defaults.headers.common['Authorization'];

      // Only trigger notification if user was previously logged in
      if (hadToken && !window.location.pathname.includes('/login')) {
        window.dispatchEvent(new CustomEvent('craftnest:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
