import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CustomerProfile, BirthdayCoupon } from '../types/restaurant';

export interface BirthdayOfferData {
  has_birthday_offer: boolean;
  greeting_title: string;
  greeting_message: string;
  birthday_status?: {
    isToday: boolean;
    isUpcoming3Days: boolean;
    isWithinValidity: boolean;
    daysUntilBirthday: number;
    birthdayThisYear: string;
    formattedDOB: string;
  };
  coupon: BirthdayCoupon | null;
}

interface CustomerAuthContextType {
  customer: CustomerProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  birthdayOffer: BirthdayOfferData | null;
  isBirthdayBannerDismissed: boolean;
  dismissBirthdayBanner: () => void;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'signup' | 'forgot';
  isAccountModalOpen: boolean;
  accountModalTab: 'orders' | 'birthday' | 'profile';
  openAuthModal: (tab?: 'login' | 'signup' | 'forgot') => void;
  closeAuthModal: () => void;
  openAccountModal: (tab?: 'orders' | 'birthday' | 'profile') => void;
  closeAccountModal: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (payload: {
    full_name: string;
    email: string;
    phone: string;
    date_of_birth: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshBirthdayOffer: () => Promise<void>;
  refreshCustomerProfile: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sai_mess_customer_token'));
  const [customer, setCustomer] = useState<CustomerProfile | null>(() => {
    try {
      const saved = localStorage.getItem('sai_mess_customer_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [birthdayOffer, setBirthdayOffer] = useState<BirthdayOfferData | null>(null);
  const [isBirthdayBannerDismissed, setIsBirthdayBannerDismissed] = useState(false);

  // Modal visibility states
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup' | 'forgot'>('login');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountModalTab, setAccountModalTab] = useState<'orders' | 'birthday' | 'profile'>('orders');

  const openAuthModal = useCallback((tab: 'login' | 'signup' | 'forgot' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const openAccountModal = useCallback((tab: 'orders' | 'birthday' | 'profile' = 'orders') => {
    setAccountModalTab(tab);
    setIsAccountModalOpen(true);
  }, []);

  const closeAccountModal = useCallback(() => {
    setIsAccountModalOpen(false);
  }, []);

  const dismissBirthdayBanner = useCallback(() => {
    setIsBirthdayBannerDismissed(true);
  }, []);

  // Fetch Birthday Offer
  const refreshBirthdayOffer = useCallback(async () => {
    if (!token) {
      setBirthdayOffer(null);
      return;
    }
    try {
      const res = await fetch('/api/customer/birthday-offer', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: BirthdayOfferData = await res.json();
        setBirthdayOffer(data);
      } else {
        setBirthdayOffer(null);
      }
    } catch (e) {
      console.warn('Failed to fetch birthday offer:', e);
    }
  }, [token]);

  // Refresh Customer profile
  const refreshCustomerProfile = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/customer/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
        localStorage.setItem('sai_mess_customer_profile', JSON.stringify(data.customer));
        if (data.active_birthday_coupon || data.birthday_status) {
          refreshBirthdayOffer();
        }
      } else {
        // Token expired or invalid
        setToken(null);
        setCustomer(null);
        setBirthdayOffer(null);
        localStorage.removeItem('sai_mess_customer_token');
        localStorage.removeItem('sai_mess_customer_profile');
      }
    } catch (e) {
      console.warn('Customer verification error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [token, refreshBirthdayOffer]);

  useEffect(() => {
    refreshCustomerProfile();
  }, [refreshCustomerProfile]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed. Please check credentials.' };
      }
      setToken(data.token);
      setCustomer(data.customer);
      localStorage.setItem('sai_mess_customer_token', data.token);
      localStorage.setItem('sai_mess_customer_profile', JSON.stringify(data.customer));
      setIsBirthdayBannerDismissed(false);
      refreshBirthdayOffer();
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to connect to server' };
    }
  };

  const register = async (payload: {
    full_name: string;
    email: string;
    phone: string;
    date_of_birth: string;
    password: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }
      setToken(data.token);
      setCustomer(data.customer);
      localStorage.setItem('sai_mess_customer_token', data.token);
      localStorage.setItem('sai_mess_customer_profile', JSON.stringify(data.customer));
      setIsBirthdayBannerDismissed(false);
      refreshBirthdayOffer();
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to connect to server' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (token) {
        await fetch('/api/customer/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // ignore
    } finally {
      setToken(null);
      setCustomer(null);
      setBirthdayOffer(null);
      setIsAccountModalOpen(false);
      localStorage.removeItem('sai_mess_customer_token');
      localStorage.removeItem('sai_mess_customer_profile');
    }
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        token,
        isAuthenticated: !!customer,
        isLoading,
        birthdayOffer,
        isBirthdayBannerDismissed,
        dismissBirthdayBanner,
        isAuthModalOpen,
        authModalTab,
        isAccountModalOpen,
        accountModalTab,
        openAuthModal,
        closeAuthModal,
        openAccountModal,
        closeAccountModal,
        login,
        register,
        logout,
        refreshBirthdayOffer,
        refreshCustomerProfile,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};
