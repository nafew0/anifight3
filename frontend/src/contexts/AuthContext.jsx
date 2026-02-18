import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Restore auth state from localStorage on mount
  useEffect(() => {
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    const storedUser = localStorage.getItem('user');

    if (storedAccessToken && storedRefreshToken && storedUser) {
      try {
        const decoded = jwtDecode(storedAccessToken);
        const currentTime = Date.now() / 1000;

        // Check if token is still valid
        if (decoded.exp > currentTime) {
          setAccessToken(storedAccessToken);
          setRefreshToken(storedRefreshToken);
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
        } else {
          // Token expired, try to refresh
          refreshAccessToken(storedRefreshToken);
        }
      } catch (error) {
        console.error('Error restoring auth state:', error);
        clearAuth();
      }
    }
    setIsLoading(false);
  }, []);

  // Set up token refresh timer
  useEffect(() => {
    if (!accessToken) return;

    try {
      const decoded = jwtDecode(accessToken);
      const expiresIn = decoded.exp * 1000 - Date.now();

      // Refresh 5 minutes before expiry
      const refreshTime = expiresIn - 5 * 60 * 1000;

      if (refreshTime > 0) {
        const timer = setTimeout(() => {
          refreshAccessToken(refreshToken);
        }, refreshTime);

        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.error('Error setting up token refresh:', error);
    }
  }, [accessToken, refreshToken]);

  const clearAuth = () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  };

  const saveAuth = (userData, access, refresh) => {
    setUser(userData);
    setAccessToken(access);
    setRefreshToken(refresh);
    setIsAuthenticated(true);
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const register = async (username, email, password, passwordConfirm) => {
    try {
      const response = await api.post('/api/auth/register/', {
        username,
        email,
        password,
        password_confirm: passwordConfirm,
      });

      const { user: userData, access, refresh } = response.data;
      saveAuth(userData, access, refresh);
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.response?.data || { detail: 'Registration failed' },
      };
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/api/auth/login/', { email, password });
      const { user: userData, access, refresh } = response.data;
      saveAuth(userData, access, refresh);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data || { detail: 'Login failed' },
      };
    }
  };

  const loginWithGoogle = async (credential) => {
    try {
      const response = await api.post('/api/auth/google/', { credential });
      const { user: userData, access, refresh } = response.data;
      saveAuth(userData, access, refresh);
      return { success: true };
    } catch (error) {
      console.error('Google login error:', error);
      return {
        success: false,
        error: error.response?.data || { detail: 'Google login failed' },
      };
    }
  };

  const logout = async () => {
    try {
      if (refreshToken) {
        await api.post('/api/auth/logout/', { refresh: refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
    }
  };

  const refreshAccessToken = async (refresh) => {
    try {
      const response = await api.post('/api/auth/token/refresh/', {
        refresh: refresh || refreshToken,
      });
      const newAccessToken = response.data.access;
      setAccessToken(newAccessToken);
      localStorage.setItem('accessToken', newAccessToken);
      return newAccessToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      clearAuth();
      return null;
    }
  };

  const value = {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    register,
    login,
    loginWithGoogle,
    logout,
    refreshAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
