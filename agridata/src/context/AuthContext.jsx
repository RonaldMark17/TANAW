import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // FIX: Initialize state directly from localStorage to prevent "Auto-Logout" flicker on refresh
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  
  const [loading, setLoading] = useState(true);

  // Unified cleanup function to reset the app state
  const handleCleanup = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');

      if (token) {
        try {
          // 1. Client-side Expiry Check
          const decoded = jwtDecode(token);
          const currentTime = Date.now() / 1000;
          
          if (decoded.exp < currentTime) {
            console.warn("JWT has expired locally.");
            handleCleanup();
            setLoading(false);
            return;
          }

          // 2. Server-side Verification (Background Sync)
          // OFFLINE FIX: Only attempt server verification if the device has internet
          if (navigator.onLine) {
            const response = await authAPI.getCurrentUser();
            
            // Update with the latest data from the Database
            setUser(response.data);
            localStorage.setItem('user', JSON.stringify(response.data));
          } else {
            console.log("App is offline. Using securely cached user session.");
          }
          
        } catch (error) {
          console.error("Session verification failed:", error);

          // CRITICAL FIX: Only log out if the server is ALIVE and says the token is invalid (401/422).
          // If error.response is undefined, the server is just restarting—DO NOT log out.
          if (error.response && (error.response.status === 401 || error.response.status === 422)) {
            handleCleanup();
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [handleCleanup]);

  const login = async (credentials) => {
    // OFFLINE FIX: Prevent crash if trying to log in without internet
    if (!navigator.onLine) {
        throw new Error("Internet connection is required to log in for the first time.");
    }

    const response = await authAPI.login(credentials);
    
    if (response.data.otp_required) {
        return response.data;
    }

    const { access_token, refresh_token, user: userData } = response.data;
    
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(userData));

    setUser(userData);
    return response.data;
  };

  const verifyOtp = async (data) => {
    if (!navigator.onLine) {
        throw new Error("Internet connection required to verify OTP.");
    }

    const response = await authAPI.verifyOtp(data);
    const { access_token, refresh_token, user: userData } = response.data;

    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(userData));

    setUser(userData);
    return response.data;
  };

  const logout = async () => {
    try {
      // OFFLINE FIX: Only tell the server to invalidate the token if we have internet.
      // Otherwise, we just clear the local storage and log out locally.
      if (navigator.onLine) {
        await authAPI.logout();
      }
    } catch (error) {
      console.warn("Server logout failed, clearing local storage only.");
    } finally {
      handleCleanup();
    }
  };

  const hasPermission = (allowedRoles) => {
    if (!user) return false;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return roles.includes(user.role);
  };

  const value = {
    user,
    loading,
    login,
    verifyOtp,
    logout,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};