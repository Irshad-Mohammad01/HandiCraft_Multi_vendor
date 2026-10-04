import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, role, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner label="Authenticating session..." />
      </div>
    );
  }

  // Not logged in -> send to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Normalize current user role
  const userRole = (role || (user.is_admin ? 'owner' : 'customer')).toLowerCase();

  // If specific roles required, verify
  if (allowedRoles.length > 0) {
    const isAuthorized = allowedRoles.some((r) => {
      const allowed = r.toLowerCase();
      if (allowed === 'owner' && (userRole === 'owner' || userRole === 'admin')) return true;
      if (allowed === 'admin' && (userRole === 'owner' || userRole === 'admin')) return true;
      return userRole === allowed;
    });

    if (!isAuthorized) {
      // Redirect to user's permitted home
      if (userRole === 'owner' || userRole === 'admin') {
        return <Navigate to="/owner/dashboard" replace />;
      }
      if (userRole === 'sub_owner') {
        return <Navigate to="/sub-owner/dashboard" replace />;
      }
      if (userRole === 'seller') {
        return <Navigate to="/seller/dashboard" replace />;
      }
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
