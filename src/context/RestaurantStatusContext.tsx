import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { RestaurantClosureStatus } from '../types/restaurant';
import { useAuth } from './AuthContext';

interface RestaurantStatusContextType {
  isClosedToday: boolean;
  statusData: RestaurantClosureStatus | null;
  isLoading: boolean;
  refreshStatus: () => Promise<void>;
  closeRestaurantToday: () => Promise<{ success: boolean; error?: string }>;
  reopenRestaurantToday: () => Promise<{ success: boolean; error?: string }>;
}

const RestaurantStatusContext = createContext<RestaurantStatusContextType | undefined>(undefined);

export const RestaurantStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [statusData, setStatusData] = useState<RestaurantClosureStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/restaurant/status', {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (res.ok) {
        const data: RestaurantClosureStatus = await res.json();
        setStatusData(data);
      }
    } catch (err) {
      console.warn('Failed to fetch restaurant status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Poll every 15 seconds so changes made in admin update all customer screens immediately
    const interval = setInterval(fetchStatus, 15000);

    // Refresh when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchStatus]);

  const closeRestaurantToday = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/admin/restaurant/close-today', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusData(data.status);
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to close restaurant' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const reopenRestaurantToday = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/admin/restaurant/reopen-today', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusData(data.status);
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to reopen restaurant' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const isClosedToday = Boolean(statusData?.is_closed_today);

  return (
    <RestaurantStatusContext.Provider
      value={{
        isClosedToday,
        statusData,
        isLoading,
        refreshStatus: fetchStatus,
        closeRestaurantToday,
        reopenRestaurantToday,
      }}
    >
      {children}
    </RestaurantStatusContext.Provider>
  );
};

export const useRestaurantStatus = (): RestaurantStatusContextType => {
  const context = useContext(RestaurantStatusContext);
  if (!context) {
    throw new Error('useRestaurantStatus must be used within a RestaurantStatusProvider');
  }
  return context;
};
