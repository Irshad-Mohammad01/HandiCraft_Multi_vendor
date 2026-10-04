import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authApi from '../api/auth';
import apiClient, { API_BASE_URL } from '../api/client';

export { API_BASE_URL };
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync state with localStorage on initialization
  useEffect(() => {
    const savedToken = localStorage.getItem('token') || localStorage.getItem('bb_token');
    const savedUser = localStorage.getItem('user') || localStorage.getItem('bb_user');

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        const parsedRole = (parsedUser.role || (parsedUser.is_admin ? 'owner' : 'customer')).toLowerCase();
        setUser(parsedUser);
        setToken(savedToken);
        setRole(parsedRole);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      } catch (err) {
        console.error('Failed to parse cached user:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Listen to 401 unauthorized events from apiClient
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      setRole(null);
      delete apiClient.defaults.headers.common['Authorization'];
    };

    window.addEventListener('craftnest:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('craftnest:unauthorized', handleUnauthorized);
  }, []);

  // Unified Login for All Roles (Backend determines role)
  const login = async (identifier, password) => {
    try {
      const response = await authApi.login(identifier, password);
      const { user: userData, token: userToken } = response;

      // Extract backend-assigned role
      const backendRole = (userData.role || (userData.is_admin ? 'owner' : 'customer')).toLowerCase();

      setUser(userData);
      setToken(userToken);
      setRole(backendRole);

      localStorage.setItem('token', userToken);
      localStorage.setItem('bb_token', userToken);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('bb_user', JSON.stringify(userData));
      localStorage.setItem('role', backendRole);

      apiClient.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;

      return {
        success: true,
        user: userData,
        role: backendRole,
        message: response.message || 'Login successful',
      };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
      return {
        success: false,
        message: errorMsg,
      };
    }
  };

  // Logout
  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setToken(null);
    setRole(null);
    localStorage.removeItem('token');
    localStorage.removeItem('bb_token');
    localStorage.removeItem('user');
    localStorage.removeItem('bb_user');
    localStorage.removeItem('role');
    delete apiClient.defaults.headers.common['Authorization'];
  }, []);

  // Update User Profile
  const updateUser = (updatedFields) => {
    setUser((prev) => {
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const isOwner = role === 'owner' || role === 'admin';
  const isSubOwner = role === 'sub_owner';
  const isSeller = role === 'seller';
  const isCustomer = role === 'customer' || (!isOwner && !isSubOwner && !isSeller && !!user);
  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        loading,
        login,
        logout,
        updateUser,
        isOwner,
        isSubOwner,
        isSeller,
        isCustomer,
        isAuthenticated,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
