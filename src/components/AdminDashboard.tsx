import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  LogOut,
  RefreshCw,
  Volume2,
  VolumeX,
  Package,
  Clock,
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Phone,
  MapPin,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
  Eye,
  X,
  Search,
  Filter,
  MessageCircle,
  Database,
  KeyRound,
  FileCode,
  Check,
  Star,
  MessageSquare,
  Send,
  CornerDownRight,
  Utensils,
  CreditCard,
  Banknote,
  Bell,
  Gift,
  Users,
  Calendar,
  Sparkles,
  CheckCheck,
  Tag,
  Power,
  Download,
  AlertTriangle,
  Lock,
  EyeOff,
  ShieldAlert,
  Key,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRestaurantStatus } from '../context/RestaurantStatusContext';
import {
  FoodCategory,
  FoodItem,
  Order,
  OrderStatus,
  OrderReview,
  BirthdayOfferConfig,
  BirthdayCoupon,
  AdminNotification,
  ApiProviderKey,
  MaskedApiConfig,
} from '../types/restaurant';
import { playOrderNotificationSound } from '../utils/soundAlert';

interface AdminDashboardProps {
  onClose: () => void;
  categories: FoodCategory[];
  foodItems: FoodItem[];
  onRefreshMenu: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onClose,
  categories,
  foodItems,
  onRefreshMenu,
}) => {
  const { logout, token } = useAuth();

  // Active Tab: 'orders' | 'menu' | 'stats' | 'reviews' | 'customers' | 'birthday-offers' | 'integrations' | 'api-settings'
  const [activeTab, setActiveTab] = useState<
    'orders' | 'menu' | 'stats' | 'reviews' | 'customers' | 'birthday-offers' | 'integrations' | 'api-settings'
  >('orders');

  // Owner-Only API Settings State
  const [apiConfigs, setApiConfigs] = useState<MaskedApiConfig[]>([]);
  const [loadingApiSettings, setLoadingApiSettings] = useState(false);
  const [selectedApiProvider, setSelectedApiProvider] = useState<ApiProviderKey>('razorpay');
  const [apiFormData, setApiFormData] = useState<Record<string, string>>({});
  const [isSavingApi, setIsSavingApi] = useState(false);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [isTogglingApi, setIsTogglingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [apiToast, setApiToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [apiDeleteConfirmProvider, setApiDeleteConfirmProvider] = useState<ApiProviderKey | null>(null);
  const [isDeletingApi, setIsDeletingApi] = useState(false);
  const [showSecretField, setShowSecretField] = useState<Record<string, boolean>>({});

  // Customer Reviews Moderation State
  const [reviews, setReviews] = useState<OrderReview[]>([]);
  const [reviewsStats, setReviewsStats] = useState({
    total: 0,
    pending: 0,
    published: 0,
    rejected: 0,
    average_rating: 5.0,
  });
  const [reviewsStatusFilter, setReviewsStatusFilter] = useState<string>('all');
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [searchOrderQuery, setSearchOrderQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // One-Click Restaurant Closure Today State
  const { isClosedToday, statusData, closeRestaurantToday, reopenRestaurantToday, refreshStatus: refreshClosureStatus } = useRestaurantStatus();
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [isReopenConfirmOpen, setIsReopenConfirmOpen] = useState(false);
  const [isTogglingClosure, setIsTogglingClosure] = useState(false);
  const [closureActionError, setClosureActionError] = useState<string | null>(null);
  const [closureActionSuccess, setClosureActionSuccess] = useState<string | null>(null);

  // Financial CSV Export State (Last 30 Days)
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [csvExportError, setCsvExportError] = useState<string | null>(null);

  // Dashboard Stats State
  const [stats, setStats] = useState({
    total_orders: 0,
    new_orders: 0,
    pending_orders: 0,
    confirmed_orders: 0,
    preparing_orders: 0,
    out_for_delivery_orders: 0,
    completed_orders: 0,
    cancelled_orders: 0,
    total_sales: 0,
    today_orders_count: 0,
    today_sales: 0,
    online_orders_count: 0,
    online_sales: 0,
    cod_orders_count: 0,
    cod_sales: 0,
    paid_orders_count: 0,
    pending_payment_orders_count: 0,
  });

  // Settings: Audio notifications and Auto-refresh
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const prevNewOrdersCountRef = useRef(0);

  // System Configuration State
  const [systemConfig, setSystemConfig] = useState<any>(null);

  // Menu Management Modal states
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);

  // Fetch Orders and Stats
  const fetchDashboardData = async (showLoading = false) => {
    if (showLoading) setIsLoadingOrders(true);
    try {
      const [ordersRes, statsRes, configRes] = await Promise.all([
        fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/dashboard/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/system/status'),
      ]);

      if (ordersRes.ok) {
        const ordersData: Order[] = await ordersRes.json();
        setOrders(ordersData);

        const newOrdersCount = ordersData.filter((o) => o.order_status === 'new').length;
        // Trigger sound alert if new orders arrived
        if (isSoundEnabled && newOrdersCount > prevNewOrdersCountRef.current && prevNewOrdersCountRef.current > 0) {
          playOrderNotificationSound();
        }
        prevNewOrdersCountRef.current = newOrdersCount;
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (configRes.ok) {
        const configData = await configRes.json();
        setSystemConfig(configData);
      }
    } catch (err) {
      console.warn('Dashboard data fetch error:', err);
    } finally {
      if (showLoading) setIsLoadingOrders(false);
    }
  };

  const fetchReviews = async () => {
    setIsLoadingReviews(true);
    try {
      const res = await fetch('/api/reviews/all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        if (data.stats) setReviewsStats(data.stats);
      }
    } catch (e) {
      console.warn('Failed to fetch reviews', e);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const handleUpdateReviewStatus = async (reviewId: string, newStatus: 'published' | 'rejected' | 'pending') => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchReviews();
      }
    } catch (e) {
      console.error('Failed to update review status', e);
    }
  };

  const handleSendOwnerReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    try {
      const res = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reply: replyText.trim() }),
      });
      if (res.ok) {
        setReplyingReviewId(null);
        setReplyText('');
        fetchReviews();
      }
    } catch (e) {
      console.error('Failed to send reply', e);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Delete this customer review permanently?')) return;
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchReviews();
      }
    } catch (e) {
      console.error('Failed to delete review', e);
    }
  };

  // -------------------------------------------------------------
  // CUSTOMERS, BIRTHDAY OFFERS & NOTIFICATIONS STATE
  // -------------------------------------------------------------
  const [adminCustomers, setAdminCustomers] = useState<any[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerBirthdayFilter, setCustomerBirthdayFilter] = useState<'all' | 'today' | 'upcoming'>('all');
  const [selectedCustomerOrdersModal, setSelectedCustomerOrdersModal] = useState<{
    customer: any;
    orders: Order[];
  } | null>(null);
  const [loadingCustomerOrders, setLoadingCustomerOrders] = useState(false);
  const [sendingOfferForId, setSendingOfferForId] = useState<string | null>(null);
  const [offerSuccessToast, setOfferSuccessToast] = useState<string | null>(null);

  // Birthday Offers Config & Stats
  const [birthdayConfig, setBirthdayConfig] = useState<BirthdayOfferConfig | null>(null);
  const [birthdayStats, setBirthdayStats] = useState<any>(null);
  const [birthdayCoupons, setBirthdayCoupons] = useState<BirthdayCoupon[]>([]);
  const [savingBirthdayConfig, setSavingBirthdayConfig] = useState(false);
  const [birthdayConfigToast, setBirthdayConfigToast] = useState<string | null>(null);

  // Notifications Center State
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/admin/customers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAdminCustomers(data);
      }
    } catch (e) {
      console.warn('Failed to fetch customers:', e);
    }
  };

  const fetchBirthdayData = async () => {
    try {
      const [configRes, couponsRes] = await Promise.all([
        fetch('/api/admin/birthday-config', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/birthday-coupons', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (configRes.ok) {
        const data = await configRes.json();
        setBirthdayConfig(data.config);
        setBirthdayStats(data.stats);
      }
      if (couponsRes.ok) {
        const data = await couponsRes.json();
        setBirthdayCoupons(data);
      }
    } catch (e) {
      console.warn('Failed to fetch birthday config/coupons:', e);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/admin/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadNotifCount(data.unread_count || 0);
      }
    } catch (e) {
      console.warn('Failed to fetch notifications:', e);
    }
  };

  const handleOpenCustomerOrders = async (customerId: string) => {
    setLoadingCustomerOrders(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedCustomerOrdersModal(data);
      }
    } catch (e) {
      console.warn('Failed to fetch customer orders:', e);
    } finally {
      setLoadingCustomerOrders(false);
    }
  };

  const handleSendManualBirthdayOffer = async (customerId: string) => {
    setSendingOfferForId(customerId);
    setOfferSuccessToast(null);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/send-birthday-offer`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setOfferSuccessToast(data.message || 'Birthday offer sent!');
        fetchCustomers();
        fetchBirthdayData();
        fetchNotifications();
        setTimeout(() => setOfferSuccessToast(null), 5000);
      }
    } catch (e: any) {
      console.warn('Failed to send offer:', e);
    } finally {
      setSendingOfferForId(null);
    }
  };

  const handleSaveBirthdayConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthdayConfig) return;
    setSavingBirthdayConfig(true);
    setBirthdayConfigToast(null);
    try {
      const res = await fetch('/api/admin/birthday-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(birthdayConfig),
      });
      const data = await res.json();
      if (res.ok) {
        setBirthdayConfigToast('Birthday offer configuration saved successfully!');
        setBirthdayConfig(data.config);
        fetchBirthdayData();
        fetchNotifications();
        setTimeout(() => setBirthdayConfigToast(null), 4000);
      }
    } catch (e) {
      console.warn('Failed to save birthday config:', e);
    } finally {
      setSavingBirthdayConfig(false);
    }
  };

  const handleMarkNotifRead = async (id: string) => {
    try {
      await fetch(`/api/admin/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotifications();
    } catch (e) {
      console.warn('Error marking notif read:', e);
    }
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      await fetch('/api/admin/notifications/mark-all-read', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotifications();
    } catch (e) {
      console.warn('Error marking all notifs read:', e);
    }
  };

  const handleDeleteNotif = async (id: string) => {
    try {
      await fetch(`/api/admin/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotifications();
    } catch (e) {
      console.warn('Error deleting notif:', e);
    }
  };

  const fetchApiSettings = async () => {
    setLoadingApiSettings(true);
    try {
      const res = await fetch('/api/admin/api-settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setApiConfigs(data.providers || []);
      }
    } catch (err) {
      console.warn('Failed to load API settings:', err);
    } finally {
      setLoadingApiSettings(false);
    }
  };

  const handleSaveApi = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingApi(true);
    setApiToast(null);
    setApiTestResult(null);

    const currentProviderConfig = apiConfigs.find((c) => c.provider === selectedApiProvider);
    const isEnabled = currentProviderConfig ? currentProviderConfig.is_enabled : true;

    try {
      const res = await fetch('/api/admin/api-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider: selectedApiProvider,
          is_enabled: isEnabled,
          credentials: apiFormData,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setApiToast({ type: 'success', message: data.message || 'API configuration saved securely!' });
        setApiFormData({});
        fetchApiSettings();
        fetchDashboardData(false);
        setTimeout(() => setApiToast(null), 5000);
      } else {
        setApiToast({ type: 'error', message: data.error || 'Failed to save configuration.' });
      }
    } catch (err: any) {
      setApiToast({ type: 'error', message: err.message || 'Network error while saving API keys.' });
    } finally {
      setIsSavingApi(false);
    }
  };

  const handleToggleApi = async (provider: ApiProviderKey, currentStatus: boolean) => {
    setIsTogglingApi(true);
    setApiToast(null);
    try {
      const res = await fetch('/api/admin/api-settings/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ provider, is_enabled: !currentStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setApiToast({ type: 'success', message: data.message });
        fetchApiSettings();
        fetchDashboardData(false);
        setTimeout(() => setApiToast(null), 4000);
      } else {
        setApiToast({ type: 'error', message: data.error || 'Failed to toggle integration.' });
      }
    } catch (err: any) {
      setApiToast({ type: 'error', message: err.message || 'Network error toggling integration.' });
    } finally {
      setIsTogglingApi(false);
    }
  };

  const handleTestApi = async (provider: ApiProviderKey) => {
    setIsTestingApi(true);
    setApiTestResult(null);
    try {
      const res = await fetch('/api/admin/api-settings/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      setApiTestResult({ success: data.success, message: data.message });
      fetchApiSettings();
    } catch (err: any) {
      setApiTestResult({ success: false, message: `Test failed: ${err.message}` });
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleDeleteApi = async () => {
    if (!apiDeleteConfirmProvider) return;
    setIsDeletingApi(true);
    setApiToast(null);
    try {
      const res = await fetch(`/api/admin/api-settings/${apiDeleteConfirmProvider}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setApiToast({ type: 'success', message: data.message });
        setApiFormData({});
        setApiTestResult(null);
        setApiDeleteConfirmProvider(null);
        fetchApiSettings();
        fetchDashboardData(false);
        setTimeout(() => setApiToast(null), 4000);
      } else {
        setApiToast({ type: 'error', message: data.error || 'Failed to delete configuration.' });
      }
    } catch (err: any) {
      setApiToast({ type: 'error', message: err.message || 'Network error deleting configuration.' });
    } finally {
      setIsDeletingApi(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(true);
    fetchReviews();
    fetchCustomers();
    fetchBirthdayData();
    fetchNotifications();
    fetchApiSettings();
  }, []);

  // Auto-refresh interval (polling every 10s)
  useEffect(() => {
    if (!isAutoRefresh) return;
    const interval = setInterval(() => {
      fetchDashboardData(false);
      fetchReviews();
      fetchCustomers();
      fetchBirthdayData();
      fetchNotifications();
    }, 10000);
    return () => clearInterval(interval);
  }, [isAutoRefresh, isSoundEnabled, token]);

  // Update Order Status Handler
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ order_status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(updated);
        }
        fetchDashboardData(false);
      }
    } catch (e) {
      console.error('Failed to update status', e);
    }
  };

  // Update Payment Status Handler
  const handleUpdatePaymentStatus = async (
    orderId: string,
    newPaymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
  ) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ payment_status: newPaymentStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(updated);
        }
        fetchDashboardData(false);
      }
    } catch (e) {
      console.error('Failed to update payment status', e);
    }
  };

  const handleCopyId = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Toggle Food Item Availability
  const handleToggleItemAvailability = async (item: FoodItem) => {
    try {
      const res = await fetch(`/api/menu/items/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_available: !item.is_available }),
      });
      if (res.ok) {
        onRefreshMenu();
      }
    } catch (e) {
      console.error('Failed to update item availability', e);
    }
  };

  // Delete Food Item
  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this food item?')) return;
    try {
      const res = await fetch(`/api/menu/items/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        onRefreshMenu();
      }
    } catch (e) {
      console.error('Failed to delete item', e);
    }
  };

  // Close Restaurant Today Confirmation Handler
  const handleConfirmCloseToday = async () => {
    setIsTogglingClosure(true);
    setClosureActionError(null);
    try {
      const res = await closeRestaurantToday();
      if (res.success) {
        setIsCloseConfirmOpen(false);
        setClosureActionSuccess('Restaurant successfully closed for today. Customer ordering has been disabled.');
        setTimeout(() => setClosureActionSuccess(null), 5000);
        fetchNotifications();
      } else {
        setClosureActionError(res.error || 'Failed to close restaurant.');
      }
    } catch (err: any) {
      setClosureActionError(err.message || 'Error occurred while closing restaurant.');
    } finally {
      setIsTogglingClosure(false);
    }
  };

  // Reopen Restaurant Today Confirmation Handler
  const handleConfirmReopenToday = async () => {
    setIsTogglingClosure(true);
    setClosureActionError(null);
    try {
      const res = await reopenRestaurantToday();
      if (res.success) {
        setIsReopenConfirmOpen(false);
        setClosureActionSuccess('Restaurant successfully reopened! Customer ordering and checkout have resumed.');
        setTimeout(() => setClosureActionSuccess(null), 5000);
        fetchNotifications();
      } else {
        setClosureActionError(res.error || 'Failed to reopen restaurant.');
      }
    } catch (err: any) {
      setClosureActionError(err.message || 'Error occurred while reopening restaurant.');
    } finally {
      setIsTogglingClosure(false);
    }
  };

  // Financial Record-keeping: Download Last 30 Days Orders as CSV
  const handleExportOrdersCSV = async () => {
    setIsExportingCSV(true);
    setCsvExportError(null);
    try {
      const res = await fetch('/api/admin/orders/export-csv', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error('Failed to generate CSV export from server.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sri-sathya-sai-mess-orders-last-30-days-${statusData?.today_ist || 'export'}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setCsvExportError(err.message || 'Failed to download CSV');
      setTimeout(() => setCsvExportError(null), 4000);
    } finally {
      setIsExportingCSV(false);
    }
  };

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'all' && o.order_status !== statusFilter) return false;
    if (paymentStatusFilter !== 'all' && o.payment_status !== paymentStatusFilter) return false;
    if (paymentMethodFilter !== 'all' && o.payment_method !== paymentMethodFilter) return false;
    if (dateFilter && !o.created_at.startsWith(dateFilter)) return false;
    if (searchOrderQuery.trim()) {
      const q = searchOrderQuery.toLowerCase();
      const matchNum = o.order_number.toLowerCase().includes(q);
      const matchPhone = o.customer_phone.includes(q);
      const matchName = o.customer_name.toLowerCase().includes(q);
      const matchPaymentId = o.razorpay_payment_id ? o.razorpay_payment_id.toLowerCase().includes(q) : false;
      const matchOrderId = o.razorpay_order_id ? o.razorpay_order_id.toLowerCase().includes(q) : false;
      if (!matchNum && !matchPhone && !matchName && !matchPaymentId && !matchOrderId) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-stone-900 text-stone-100 flex flex-col overflow-hidden">
      {/* Top Header */}
      <header className="px-4 sm:px-6 py-3.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-serif font-bold text-white tracking-tight">
                Sri Sathya Sai Mess
              </h1>
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                Owner Portal
              </span>
            </div>
            <p className="text-[11px] text-stone-400">
              Kitchen Orders · Menu Management · Live Sales
            </p>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications Center Bell */}
          <div className="relative">
            <button
              onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
              className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer relative ${
                unreadNotifCount > 0
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-white'
              }`}
              title="Notifications Center"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotifDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs">
                <div className="p-3 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Bell className="w-3.5 h-3.5 text-amber-400" />
                    <span>Owner Notifications</span>
                    {unreadNotifCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-mono">
                        {unreadNotifCount} new
                      </span>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={handleMarkAllNotifsRead}
                      className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="w-3 h-3" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-stone-800">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-stone-500">
                      No notifications right now
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3 transition-colors ${
                          !notif.is_read ? 'bg-amber-950/20 border-l-2 border-amber-500' : 'bg-stone-900/40 opacity-75'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <span>{notif.title}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {!notif.is_read && (
                              <button
                                onClick={() => handleMarkNotifRead(notif.id)}
                                className="text-[10px] text-amber-400 hover:text-amber-300 font-medium"
                                title="Mark read"
                              >
                                Mark read
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteNotif(notif.id)}
                              className="text-stone-500 hover:text-red-400 p-0.5"
                              title="Delete notification"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-stone-300 mt-1 text-[11px] leading-relaxed">{notif.message}</p>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-500">
                          <span>{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {notif.customer_phone && (
                            <a
                              href={`https://api.whatsapp.com/send?phone=91${notif.customer_phone}&text=${encodeURIComponent(`Hello ${notif.customer_name || 'Customer'}, Sri Sathya Sai Mess wishes you a Happy Birthday!`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400 hover:underline flex items-center gap-0.5"
                            >
                              <span>WhatsApp</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Prominent One-Click Restaurant Closure Control */}
          {!isClosedToday ? (
            <button
              onClick={() => {
                setClosureActionError(null);
                setIsCloseConfirmOpen(true);
              }}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-red-500"
              title="Close restaurant for today in Asia/Kolkata (IST)"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Close Restaurant Today</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-950/80 border border-red-700 text-[11px] font-bold text-red-300">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>Closed Today ({statusData?.today_ist || 'IST'})</span>
              </span>
              <button
                onClick={() => {
                  setClosureActionError(null);
                  setIsReopenConfirmOpen(true);
                }}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-emerald-500"
                title="Reopen restaurant for today"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Reopen Restaurant Today</span>
              </button>
            </div>
          )}

          {/* Download Last 30 Days Orders CSV */}
          <button
            onClick={handleExportOrdersCSV}
            disabled={isExportingCSV}
            className="p-2 sm:px-3 sm:py-2 rounded-lg bg-stone-800 hover:bg-stone-700 active:scale-95 border border-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download financial orders report for last 30 days as CSV"
          >
            <Download className={`w-3.5 h-3.5 ${isExportingCSV ? 'animate-bounce text-amber-400' : ''}`} />
            <span className="hidden md:inline">{isExportingCSV ? 'Exporting CSV...' : 'Download 30 Days CSV'}</span>
          </button>

          <button
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              isSoundEnabled
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400'
                : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}
            title={isSoundEnabled ? 'Audio alerts active' : 'Audio alerts muted'}
          >
            {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{isSoundEnabled ? 'Sound On' : 'Muted'}</span>
          </button>

          <button
            onClick={() => fetchDashboardData(true)}
            disabled={isLoadingOrders}
            className="p-2 rounded-lg bg-stone-800 border border-stone-700 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingOrders ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={logout}
            className="p-2 rounded-lg bg-stone-800 hover:bg-red-950/40 border border-stone-700 hover:border-red-800 text-stone-300 hover:text-red-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-colors cursor-pointer"
          >
            Exit to Website
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-stone-900 border-b border-stone-800 px-4 sm:px-6 flex items-center justify-between overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 py-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Kitchen Orders</span>
            {stats.new_orders > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-red-600 text-white animate-pulse">
                {stats.new_orders} NEW
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'customers'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customers & Birthdays ({adminCustomers.length})</span>
            {birthdayStats?.birthdays_today_count > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-600 text-white animate-bounce">
                🎂 {birthdayStats.birthdays_today_count} Today
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('birthday-offers')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'birthday-offers'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Birthday Offers</span>
            {birthdayConfig?.is_active && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'menu'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Edit2 className="w-4 h-4" />
            <span>Food Menu ({foodItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'stats'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Sales & Stats</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'reviews'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>Customer Reviews ({reviews.length})</span>
            {reviewsStats.pending > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-600 text-white">
                {reviewsStats.pending}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('integrations')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'integrations'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Database & Cloud Setup</span>
          </button>

          <button
            onClick={() => setActiveTab('api-settings')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'api-settings'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span>API Settings</span>
          </button>
        </div>

        {/* Integration status pills */}
        <div className="hidden lg:flex items-center gap-4 text-[11px] text-stone-400 pr-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                systemConfig?.supabase_configured ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span>
              {systemConfig?.supabase_configured ? 'Supabase Connected' : 'Local Fallback Storage'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                systemConfig?.razorpay_configured ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span>
              {systemConfig?.razorpay_configured ? 'Razorpay Live' : 'Razorpay Sandbox'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Restaurant Closed Status Banner for Owner */}
        {isClosedToday && (
          <div className="bg-red-950/70 border-2 border-red-600 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-red-100 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Power className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" />
                  <h3 className="font-bold text-sm text-white">Restaurant Closed for Today ({statusData?.today_ist || 'IST'})</h3>
                </div>
                <p className="text-xs text-red-200 mt-0.5">
                  Online ordering is currently suspended across the customer website. The restaurant will automatically reset and reopen tomorrow at 00:00 IST.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setClosureActionError(null);
                setIsReopenConfirmOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm transition cursor-pointer shrink-0"
            >
              Reopen Restaurant Today
            </button>
          </div>
        )}

        {/* Action feedback notifications */}
        {closureActionSuccess && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-600 rounded-xl text-xs text-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{closureActionSuccess}</span>
            </div>
            <button onClick={() => setClosureActionSuccess(null)} className="text-emerald-400 hover:text-white cursor-pointer">✕</button>
          </div>
        )}

        {closureActionError && (
          <div className="p-3 bg-red-950/80 border border-red-600 rounded-xl text-xs text-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{closureActionError}</span>
            </div>
            <button onClick={() => setClosureActionError(null)} className="text-red-400 hover:text-white cursor-pointer">✕</button>
          </div>
        )}

        {csvExportError && (
          <div className="p-3 bg-red-950/80 border border-red-600 rounded-xl text-xs text-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{csvExportError}</span>
            </div>
            <button onClick={() => setCsvExportError(null)} className="text-red-400 hover:text-white cursor-pointer">✕</button>
          </div>
        )}

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Orders</span>
            <span className="text-xl font-bold text-white tabular-nums">{stats.total_orders}</span>
          </div>

          <div className="p-3.5 bg-red-950/40 rounded-xl border border-red-800/60">
            <span className="text-[10px] uppercase font-bold text-red-400 block">New Orders</span>
            <span className="text-xl font-bold text-red-200 tabular-nums">{stats.new_orders}</span>
          </div>

          <div className="p-3.5 bg-amber-950/40 rounded-xl border border-amber-800/60">
            <span className="text-[10px] uppercase font-bold text-amber-400 block">Preparing</span>
            <span className="text-xl font-bold text-amber-200 tabular-nums">{stats.preparing_orders}</span>
          </div>

          <div className="p-3.5 bg-blue-950/40 rounded-xl border border-blue-800/60">
            <span className="text-[10px] uppercase font-bold text-blue-400 block">Out for Delivery</span>
            <span className="text-xl font-bold text-blue-200 tabular-nums">{stats.out_for_delivery_orders}</span>
          </div>

          <div className="p-3.5 bg-emerald-950/40 rounded-xl border border-emerald-800/60">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Delivered</span>
            <span className="text-xl font-bold text-emerald-200 tabular-nums">{stats.completed_orders}</span>
          </div>

          <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800">
            <span className="text-[10px] uppercase font-bold text-amber-400 block">Total Sales</span>
            <span className="text-xl font-bold text-amber-300 tabular-nums">₹{stats.total_sales}</span>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: ORDERS & LIVE KITCHEN */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-3">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                {/* Kitchen Status Filters */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-stone-400 font-semibold mr-1 flex items-center gap-1">
                    <Filter className="w-3 h-3" />
                    Kitchen:
                  </span>
                  {[
                    { key: 'all', label: 'All Kitchen' },
                    { key: 'new', label: 'New' },
                    { key: 'confirmed', label: 'Confirmed' },
                    { key: 'preparing', label: 'Preparing' },
                    { key: 'out_for_delivery', label: 'Out for Delivery' },
                    { key: 'delivered', label: 'Delivered' },
                    { key: 'cancelled', label: 'Cancelled' },
                  ].map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setStatusFilter(s.key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        statusFilter === s.key
                          ? 'bg-amber-500 text-stone-950 shadow-xs'
                          : 'bg-stone-850 hover:bg-stone-800 text-stone-300'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Search input */}
                <div className="relative flex-1 sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search Order #, Phone, Name, or Razorpay ID..."
                    value={searchOrderQuery}
                    onChange={(e) => setSearchOrderQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-850 border border-stone-700 rounded-lg text-stone-100 placeholder-stone-500 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Payment Status & Method Filters */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-850">
                <span className="text-[11px] text-stone-400 font-semibold mr-1 flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-amber-400" />
                  Payment Status:
                </span>
                {[
                  { key: 'all', label: 'All Payments' },
                  { key: 'paid', label: 'Paid ✓' },
                  { key: 'pending', label: 'Pending ⏳' },
                  { key: 'failed', label: 'Failed ✕' },
                ].map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPaymentStatusFilter(p.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      paymentStatusFilter === p.key
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-stone-850 hover:bg-stone-800 text-stone-400'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}

                <span className="text-[11px] text-stone-600 mx-1">|</span>

                <span className="text-[11px] text-stone-400 font-semibold mr-1">Method:</span>
                {[
                  { key: 'all', label: 'All Methods' },
                  { key: 'razorpay_online', label: 'Razorpay Online' },
                  { key: 'cash_on_delivery', label: 'Cash on Delivery (COD)' },
                ].map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setPaymentMethodFilter(m.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      paymentMethodFilter === m.key
                        ? 'bg-amber-600 text-white font-bold'
                        : 'bg-stone-850 hover:bg-stone-800 text-stone-400'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}

                <div className="ml-auto">
                  <button
                    onClick={handleExportOrdersCSV}
                    disabled={isExportingCSV}
                    className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Download financial orders report for last 30 days as CSV"
                  >
                    <Download className={`w-3.5 h-3.5 ${isExportingCSV ? 'animate-bounce text-amber-400' : ''}`} />
                    <span>{isExportingCSV ? 'Generating CSV...' : 'Export Last 30 Days (CSV)'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-stone-950 rounded-xl border border-stone-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-300">
                  <thead className="bg-stone-900 border-b border-stone-800 text-[11px] uppercase tracking-wider text-stone-400">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Order ID</th>
                      <th className="py-3 px-4 font-semibold">Customer</th>
                      <th className="py-3 px-4 font-semibold">Ordered Items</th>
                      <th className="py-3 px-4 font-semibold">Total Amount</th>
                      <th className="py-3 px-4 font-semibold">Payment Details</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-stone-500">
                          No orders found matching the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((ord) => (
                        <tr
                          key={ord.id}
                          className={`hover:bg-stone-900/60 transition-colors ${
                            ord.order_status === 'new' ? 'bg-red-950/20' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-amber-400 whitespace-nowrap">
                            #{ord.order_number}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-white block">{ord.customer_name}</span>
                            <span className="text-stone-400 text-[11px] tabular-nums">
                              {ord.customer_phone}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="line-clamp-2 text-stone-300">
                              {ord.items.map((i) => `${i.item_name} ×${i.quantity}`).join(', ')}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white tabular-nums whitespace-nowrap">
                            ₹{ord.final_total}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  ord.payment_method === 'razorpay_online'
                                    ? 'bg-blue-950/80 text-blue-300 border border-blue-800'
                                    : 'bg-stone-800 text-stone-300 border border-stone-700'
                                }`}
                              >
                                {ord.payment_method === 'razorpay_online' ? 'Razorpay Online' : 'Cash on Delivery'}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[11px] font-extrabold uppercase ${
                                    ord.payment_status === 'paid'
                                      ? 'text-emerald-400'
                                      : ord.payment_status === 'failed'
                                      ? 'text-red-400'
                                      : 'text-amber-400'
                                  }`}
                                >
                                  {ord.payment_status === 'paid' ? 'PAID ✓' : ord.payment_status.toUpperCase()}
                                </span>
                                {ord.razorpay_payment_id && (
                                  <button
                                    onClick={() => handleCopyId(ord.razorpay_payment_id!)}
                                    title="Click to copy Razorpay Payment ID"
                                    className="text-[10px] font-mono text-stone-400 hover:text-white bg-stone-900 border border-stone-800 px-1.5 py-0.5 rounded cursor-pointer"
                                  >
                                    {copiedId === ord.razorpay_payment_id
                                      ? 'Copied!'
                                      : ord.razorpay_payment_id.slice(0, 11) + '...'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                                ord.order_status === 'new'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : ord.order_status === 'preparing'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : ord.order_status === 'out_for_delivery'
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : ord.order_status === 'delivered'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-stone-800 text-stone-400'
                              }`}
                            >
                              {ord.order_status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedOrder(ord)}
                              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-400" />
                              <span>Details</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: FOOD MENU MANAGEMENT */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'menu' && (
          <div className="space-y-4">
            <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-serif font-bold text-white">Menu & Dish Catalog</h3>
                <p className="text-xs text-stone-400">
                  Update dish prices, toggle availability in real-time, upload photos, or add special curries.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddCategoryModalOpen(true)}
                  className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-lg border border-stone-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Add Category</span>
                </button>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setIsAddItemModalOpen(true);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Food Item</span>
                </button>
              </div>
            </div>

            {/* Menu Items Table */}
            <div className="bg-stone-950 rounded-xl border border-stone-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-300">
                  <thead className="bg-stone-900 border-b border-stone-800 text-[11px] uppercase tracking-wider text-stone-400">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Dish</th>
                      <th className="py-3 px-4 font-semibold">Category</th>
                      <th className="py-3 px-4 font-semibold">Type</th>
                      <th className="py-3 px-4 font-semibold">Price (INR)</th>
                      <th className="py-3 px-4 font-semibold">Availability</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850">
                    {foodItems.map((item) => (
                      <tr key={item.id} className="hover:bg-stone-900/60 transition-colors">
                        <td className="py-3.5 px-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-stone-800 overflow-hidden shrink-0 border border-stone-700">
                            <img
                              src={item.image_url}
                              alt={item.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <span className="font-bold text-white block">{item.name}</span>
                            <span className="text-stone-400 text-[11px] line-clamp-1">
                              {item.description}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-stone-300">
                          {item.category_name}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.is_veg
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                                : 'bg-red-950/60 text-red-400 border border-red-800'
                            }`}
                          >
                            {item.is_veg ? 'VEG' : 'NON-VEG'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-amber-400 tabular-nums">
                          ₹{item.price}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleItemAvailability(item)}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                              item.is_available
                                ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700 hover:bg-emerald-800/40'
                                : 'bg-red-900/40 text-red-300 border border-red-700 hover:bg-red-800/40'
                            }`}
                          >
                            {item.is_available ? 'Available' : 'Sold Out'}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setIsAddItemModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
                            title="Edit Item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 rounded-lg bg-stone-800 hover:bg-red-900/40 text-stone-400 hover:text-red-400 transition-colors cursor-pointer"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: STATS & ANALYTICS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
                <span className="text-xs uppercase font-bold text-stone-400">Today's Revenue</span>
                <span className="text-3xl font-bold text-amber-400 tabular-nums block">
                  ₹{stats.today_sales}
                </span>
                <span className="text-xs text-stone-500">
                  From {stats.today_orders_count} orders placed today
                </span>
              </div>

              <div className="p-5 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
                <span className="text-xs uppercase font-bold text-stone-400">All-Time Revenue</span>
                <span className="text-3xl font-bold text-white tabular-nums block">
                  ₹{stats.total_sales}
                </span>
                <span className="text-xs text-stone-500">Across {stats.total_orders} total orders</span>
              </div>

              <div className="p-5 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
                <span className="text-xs uppercase font-bold text-stone-400">Fulfillment Rate</span>
                <span className="text-3xl font-bold text-emerald-400 tabular-nums block">
                  {stats.total_orders > 0
                    ? `${Math.round((stats.completed_orders / stats.total_orders) * 100)}%`
                    : '100%'}
                </span>
                <span className="text-xs text-stone-500">
                  {stats.completed_orders} orders delivered successfully
                </span>
              </div>
            </div>

            {/* Quick breakdown list */}
            <div className="p-6 bg-stone-950 rounded-xl border border-stone-800 space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Order Lifecycle Distribution
              </h4>
              <div className="space-y-3 text-xs">
                {[
                  { label: 'New Unconfirmed Orders', count: stats.new_orders, color: 'bg-red-500' },
                  { label: 'Confirmed by Kitchen', count: stats.confirmed_orders, color: 'bg-amber-500' },
                  { label: 'Currently Preparing', count: stats.preparing_orders, color: 'bg-amber-400' },
                  { label: 'Out for Delivery', count: stats.out_for_delivery_orders, color: 'bg-blue-500' },
                  { label: 'Completed & Delivered', count: stats.completed_orders, color: 'bg-emerald-500' },
                  { label: 'Cancelled / Rejected', count: stats.cancelled_orders, color: 'bg-stone-500' },
                ].map((row, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-stone-300">
                      <span>{row.label}</span>
                      <span className="font-bold tabular-nums text-white">{row.count} orders</span>
                    </div>
                    <div className="h-2 w-full bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${row.color}`}
                        style={{
                          width: `${
                            stats.total_orders > 0
                              ? Math.max(4, (row.count / stats.total_orders) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment & Revenue Method Analysis */}
            <div className="p-6 bg-stone-950 rounded-xl border border-stone-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>Payment Gateway & Collection Breakdown</span>
                </h4>
                <span className="text-[11px] text-stone-400">
                  {stats.paid_orders_count} Paid / {stats.pending_payment_orders_count} Pending
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Razorpay Online */}
                <div className="p-4 bg-stone-900 rounded-xl border border-blue-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-300 text-xs flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                      Razorpay Online (UPI / Cards / NetBanking)
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                      HMAC-SHA256
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-white font-mono block">
                    ₹{stats.online_sales}
                  </span>
                  <p className="text-[11px] text-stone-400">
                    {stats.online_orders_count} orders paid digitally via Razorpay Standard Checkout
                  </p>
                </div>

                {/* Cash on Delivery */}
                <div className="p-4 bg-stone-900 rounded-xl border border-amber-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-amber-400" />
                      Cash on Delivery (Doorstep Collection)
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                      COD
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-white font-mono block">
                    ₹{stats.cod_sales}
                  </span>
                  <p className="text-[11px] text-stone-400">
                    {stats.cod_orders_count} orders payable in cash upon food delivery
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB: CUSTOMER REVIEWS & FEEDBACK MODERATION */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            {/* Review KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Reviews</span>
                <span className="text-xl font-bold text-white tabular-nums">{reviewsStats.total}</span>
              </div>

              <div className="p-3.5 bg-amber-950/40 rounded-xl border border-amber-800/60">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">Avg Rating</span>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="text-xl font-bold text-amber-300 tabular-nums">{reviewsStats.average_rating}</span>
                </div>
              </div>

              <div className="p-3.5 bg-emerald-950/40 rounded-xl border border-emerald-800/60">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">Published</span>
                <span className="text-xl font-bold text-emerald-200 tabular-nums">{reviewsStats.published}</span>
              </div>

              <div className="p-3.5 bg-amber-950/40 rounded-xl border border-amber-800/60">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">Pending Review</span>
                <span className="text-xl font-bold text-amber-200 tabular-nums">{reviewsStats.pending}</span>
              </div>

              <div className="p-3.5 bg-red-950/40 rounded-xl border border-red-800/60">
                <span className="text-[10px] uppercase font-bold text-red-400 block">Rejected / Hidden</span>
                <span className="text-xl font-bold text-red-200 tabular-nums">{reviewsStats.rejected}</span>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-400 font-semibold mr-1">Filter by Status:</span>
                {[
                  { key: 'all', label: `All (${reviews.length})` },
                  { key: 'published', label: `Published (${reviewsStats.published})` },
                  { key: 'pending', label: `Pending (${reviewsStats.pending})` },
                  { key: 'rejected', label: `Rejected (${reviewsStats.rejected})` },
                ].map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setReviewsStatusFilter(s.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      reviewsStatusFilter === s.key
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-stone-850 hover:bg-stone-800 text-stone-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <button
                onClick={fetchReviews}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingReviews ? 'animate-spin' : ''}`} />
                <span>Refresh Reviews</span>
              </button>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
              {reviews.filter((r) => reviewsStatusFilter === 'all' || r.status === reviewsStatusFilter).length === 0 ? (
                <div className="p-12 text-center bg-stone-950 rounded-xl border border-stone-800 text-stone-400 text-xs">
                  No reviews found matching this filter.
                </div>
              ) : (
                reviews
                  .filter((r) => reviewsStatusFilter === 'all' || r.status === reviewsStatusFilter)
                  .map((rev) => (
                    <div
                      key={rev.id}
                      className="p-5 bg-stone-950 rounded-xl border border-stone-800 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-850">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-amber-400">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-4 h-4 ${
                                  s <= rev.rating ? 'fill-amber-400' : 'text-stone-700'
                                }`}
                              />
                            ))}
                          </div>
                          <div>
                            <span className="font-bold text-white text-sm block">
                              {rev.customer_name}
                            </span>
                            <span className="text-[11px] text-amber-400 font-mono">
                              Verified Order #{rev.order_number}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              rev.status === 'published'
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                                : rev.status === 'pending'
                                ? 'bg-amber-950/60 text-amber-400 border border-amber-800'
                                : 'bg-red-950/60 text-red-400 border border-red-800'
                            }`}
                          >
                            {rev.status.toUpperCase()}
                          </span>

                          <span className="text-stone-500 text-[11px]">
                            {new Date(rev.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Comment text */}
                      <p className="text-xs text-stone-200 leading-relaxed italic">
                        "{rev.comment}"
                      </p>

                      {/* Sub-ratings */}
                      {(rev.food_taste_rating || rev.delivery_rating) && (
                        <div className="flex items-center gap-4 text-[11px] text-stone-400">
                          {rev.food_taste_rating && (
                            <span className="flex items-center gap-1">
                              <Utensils className="w-3.5 h-3.5 text-amber-400" />
                              Taste: <strong className="text-white">{rev.food_taste_rating}/5</strong>
                            </span>
                          )}
                          {rev.delivery_rating && (
                            <span className="flex items-center gap-1">
                              <Package className="w-3.5 h-3.5 text-amber-400" />
                              Delivery: <strong className="text-white">{rev.delivery_rating}/5</strong>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Owner Reply Display */}
                      {rev.owner_reply && (
                        <div className="p-3 bg-stone-900 rounded-lg border border-stone-800 text-xs space-y-1">
                          <div className="flex items-center justify-between text-amber-400 font-bold text-[11px]">
                            <span className="flex items-center gap-1">
                              <CornerDownRight className="w-3.5 h-3.5" />
                              Owner Response:
                            </span>
                            <span className="text-stone-500 text-[10px]">
                              {rev.owner_replied_at &&
                                new Date(rev.owner_replied_at).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                            </span>
                          </div>
                          <p className="text-stone-300 leading-relaxed">{rev.owner_reply}</p>
                        </div>
                      )}

                      {/* Reply Input Box */}
                      {replyingReviewId === rev.id && (
                        <div className="p-3 bg-stone-900 rounded-lg border border-stone-800 space-y-2">
                          <label className="block text-[11px] font-bold text-amber-400">
                            Reply as Sri Sathya Sai Mess Owner:
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Thank the customer or address feedback..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-white text-xs"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setReplyingReviewId(null);
                                setReplyText('');
                              }}
                              className="px-3 py-1 bg-stone-800 text-stone-300 rounded text-xs"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSendOwnerReply(rev.id)}
                              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded text-xs flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" />
                              <span>Post Reply</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action Moderation Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-850 text-xs">
                        <div className="flex items-center gap-2">
                          {rev.status !== 'published' && (
                            <button
                              onClick={() => handleUpdateReviewStatus(rev.id, 'published')}
                              className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-lg font-semibold transition-colors cursor-pointer"
                            >
                              Approve & Publish
                            </button>
                          )}
                          {rev.status !== 'rejected' && (
                            <button
                              onClick={() => handleUpdateReviewStatus(rev.id, 'rejected')}
                              className="px-3 py-1.5 bg-stone-850 hover:bg-red-950 text-stone-300 hover:text-red-300 rounded-lg font-semibold transition-colors cursor-pointer"
                            >
                              Hide / Reject
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setReplyingReviewId(rev.id);
                              setReplyText(rev.owner_reply || '');
                            }}
                            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-400 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{rev.owner_reply ? 'Edit Reply' : 'Reply to Customer'}</span>
                          </button>
                        </div>

                        <button
                          onClick={() => handleDeleteReview(rev.id)}
                          className="p-1.5 text-stone-500 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors cursor-pointer"
                          title="Delete Review"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: DATABASE & CLOUD SETUP GUIDE */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <div className="p-5 bg-stone-950 rounded-xl border border-stone-800 space-y-3">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Live Integrations & Cloud Setup</h3>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">
                Sri Sathya Sai Mess is engineered for complete production operation. It operates seamlessly in both AI Studio sandbox mode and with live external credentials.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Supabase Box */}
              <div className="p-5 bg-stone-950 rounded-xl border border-stone-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-emerald-400" />
                      Supabase Cloud DB
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        systemConfig?.supabase_configured
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {systemConfig?.supabase_configured ? 'CONNECTED' : 'LOCAL FALLBACK'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Uses Postgres with Row Level Security (RLS) for owner profiles, categories, items, orders, payment records, and notification logs.
                  </p>
                  <div className="pt-2 text-[11px] text-stone-400 space-y-1">
                    <p>• Script: <code className="text-amber-400">supabase-schema.sql</code></p>
                    <p>• Storage: <code className="text-amber-400">food-images</code> bucket</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-stone-800 text-[11px] text-stone-500">
                  Configure via <code className="text-stone-300">SUPABASE_URL</code> & <code className="text-stone-300">SUPABASE_ANON_KEY</code>
                </div>
              </div>

              {/* Razorpay Box */}
              <div className="p-5 bg-stone-950 rounded-xl border border-stone-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-amber-400" />
                      Razorpay Gateway
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        systemConfig?.razorpay_configured
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {systemConfig?.razorpay_configured ? 'LIVE VERIFIED' : 'TEST MODE'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Server-side order creation at <code className="text-stone-300">/api/payments/create-razorpay-order</code> and cryptographic HMAC-SHA256 signature verification.
                  </p>
                </div>
                <div className="pt-3 border-t border-stone-800 text-[11px] text-stone-500">
                  Configure via <code className="text-stone-300">RAZORPAY_KEY_ID</code> & <code className="text-stone-300">RAZORPAY_KEY_SECRET</code>
                </div>
              </div>

              {/* WhatsApp Box */}
              <div className="p-5 bg-stone-950 rounded-xl border border-stone-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4 text-emerald-400" />
                      WhatsApp Business API
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        systemConfig?.whatsapp_configured
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {systemConfig?.whatsapp_configured ? 'API ACTIVE' : 'MANUAL FALLBACK READY'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Direct automated alerts to restaurant phone: <strong className="text-white">+91 97015 76804</strong>. Generates pre-formatted click-to-chat links with full order details.
                  </p>
                </div>
                <div className="pt-3 border-t border-stone-800 text-[11px] text-stone-500">
                  Configure via <code className="text-stone-300">WHATSAPP_ACCESS_TOKEN</code> & <code className="text-stone-300">WHATSAPP_PHONE_NUMBER_ID</code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: REGISTERED CUSTOMERS & BIRTHDAYS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'customers' && (
          <div className="space-y-5">
            {offerSuccessToast && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-700 text-emerald-200 rounded-xl text-xs flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {offerSuccessToast}
                </span>
                <button onClick={() => setOfferSuccessToast(null)} className="text-emerald-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Customers KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Customers</span>
                <span className="text-2xl font-bold text-white tabular-nums">{adminCustomers.length}</span>
                <span className="text-[10px] text-stone-500 block mt-1">With registered accounts & DOB</span>
              </div>

              <div className="p-4 bg-amber-950/40 rounded-xl border border-amber-800/80">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">🎂 Birthdays Today</span>
                <span className="text-2xl font-bold text-amber-200 tabular-nums">
                  {adminCustomers.filter((c) => c.birthday_status?.isToday).length}
                </span>
                <span className="text-[10px] text-amber-300/80 block mt-1">Active birthday celebrations</span>
              </div>

              <div className="p-4 bg-orange-950/40 rounded-xl border border-orange-800/80">
                <span className="text-[10px] uppercase font-bold text-orange-400 block">⏳ Upcoming (in 3 Days)</span>
                <span className="text-2xl font-bold text-orange-200 tabular-nums">
                  {adminCustomers.filter((c) => c.birthday_status?.isUpcoming3Days).length}
                </span>
                <span className="text-[10px] text-orange-300/80 block mt-1">Approaching celebrations</span>
              </div>

              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">Active Birthday Offer</span>
                <span className="text-sm font-bold text-white block mt-1">
                  {birthdayConfig?.is_active ? (
                    birthdayConfig.offer_type === 'percentage'
                      ? `${birthdayConfig.discount_percentage}% OFF`
                      : `₹${birthdayConfig.fixed_discount_amount} OFF`
                  ) : (
                    'Paused'
                  )}
                </span>
                <span className="text-[10px] text-stone-500 block">
                  Min order: ₹{birthdayConfig?.min_order_value || 0}
                </span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setCustomerBirthdayFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    customerBirthdayFilter === 'all'
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-stone-850 hover:bg-stone-800 text-stone-300'
                  }`}
                >
                  All ({adminCustomers.length})
                </button>
                <button
                  onClick={() => setCustomerBirthdayFilter('today')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                    customerBirthdayFilter === 'today'
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-stone-850 hover:bg-stone-800 text-amber-400'
                  }`}
                >
                  <span>🎂 Today's Birthdays</span>
                  <span className="px-1.5 py-0.2 bg-amber-400/20 text-amber-200 text-[10px] rounded-full">
                    {adminCustomers.filter((c) => c.birthday_status?.isToday).length}
                  </span>
                </button>
                <button
                  onClick={() => setCustomerBirthdayFilter('upcoming')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                    customerBirthdayFilter === 'upcoming'
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-stone-850 hover:bg-stone-800 text-orange-400'
                  }`}
                >
                  <span>⏳ Approaching in 3 Days</span>
                  <span className="px-1.5 py-0.2 bg-orange-400/20 text-orange-200 text-[10px] rounded-full">
                    {adminCustomers.filter((c) => c.birthday_status?.isUpcoming3Days).length}
                  </span>
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search name, phone, email..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-stone-900 border border-stone-800 rounded-lg text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            {/* Customers Table */}
            <div className="bg-stone-950 rounded-xl border border-stone-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-300">
                  <thead className="bg-stone-900 text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-800">
                    <tr>
                      <th className="py-3 px-4">Customer Details</th>
                      <th className="py-3 px-4">Mobile Number</th>
                      <th className="py-3 px-4">Date of Birth</th>
                      <th className="py-3 px-4">Birthday Status</th>
                      <th className="py-3 px-4">Total Orders</th>
                      <th className="py-3 px-4">Total Spent</th>
                      <th className="py-3 px-4 text-right">Owner Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850">
                    {adminCustomers
                      .filter((c) => {
                        if (customerBirthdayFilter === 'today' && !c.birthday_status?.isToday) return false;
                        if (customerBirthdayFilter === 'upcoming' && !c.birthday_status?.isUpcoming3Days) return false;
                        if (customerSearchQuery.trim()) {
                          const q = customerSearchQuery.toLowerCase();
                          const matchName = c.full_name?.toLowerCase().includes(q);
                          const matchPhone = c.phone?.includes(q);
                          const matchEmail = c.email?.toLowerCase().includes(q);
                          if (!matchName && !matchPhone && !matchEmail) return false;
                        }
                        return true;
                      })
                      .map((customer) => {
                        const isToday = customer.birthday_status?.isToday;
                        const isUpcoming = customer.birthday_status?.isUpcoming3Days;
                        const isWithinWeek = customer.birthday_status?.isWithinValidity;

                        return (
                          <tr
                            key={customer.id}
                            className={`hover:bg-stone-900/60 transition-colors ${
                              isToday ? 'bg-amber-950/20' : isUpcoming ? 'bg-orange-950/10' : ''
                            }`}
                          >
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-white text-sm flex items-center gap-2">
                                <span>{customer.full_name}</span>
                                {isToday && <span className="text-base animate-bounce">🎂</span>}
                              </div>
                              <span className="text-[11px] text-stone-400 block">{customer.email}</span>
                            </td>

                            <td className="py-3.5 px-4 font-mono font-medium text-stone-200">
                              <a
                                href={`tel:${customer.phone}`}
                                className="hover:text-amber-400 hover:underline flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3 text-amber-500" />
                                +91 {customer.phone}
                              </a>
                            </td>

                            <td className="py-3.5 px-4 font-mono">
                              <span className="flex items-center gap-1.5 text-stone-200 font-semibold">
                                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                                {customer.date_of_birth}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              {isToday ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500 text-stone-950 flex items-center gap-1 w-max animate-pulse">
                                  🎂 BIRTHDAY TODAY!
                                </span>
                              ) : isUpcoming ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-950 text-orange-300 border border-orange-700 flex items-center gap-1 w-max">
                                  ⏳ In 3 Days ({customer.birthday_status?.birthdayThisYear})
                                </span>
                              ) : isWithinWeek ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1 w-max">
                                  ✨ Birthday Week
                                </span>
                              ) : (
                                <span className="text-[11px] text-stone-500">
                                  In {customer.birthday_status?.daysUntilBirthday} days
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 font-bold text-white tabular-nums">
                              {customer.total_orders} orders
                            </td>

                            <td className="py-3.5 px-4 font-bold text-amber-400 tabular-nums">
                              ₹{customer.total_spent}
                            </td>

                            <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                              <button
                                onClick={() => handleOpenCustomerOrders(customer.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-stone-850 hover:bg-stone-800 text-stone-300 hover:text-white text-[11px] font-semibold transition"
                              >
                                Past Orders
                              </button>

                              <button
                                onClick={() => handleSendManualBirthdayOffer(customer.id)}
                                disabled={sendingOfferForId === customer.id}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold transition flex-inline items-center gap-1 disabled:opacity-50"
                                title="Send celebratory birthday offer coupon via WhatsApp & Email"
                              >
                                {sendingOfferForId === customer.id ? (
                                  'Sending...'
                                ) : (
                                  <>
                                    <span>🎂 Wish & Offer</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 6: BIRTHDAY OFFERS & COUPONS CONFIGURATION */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'birthday-offers' && (
          <div className="space-y-6">
            {birthdayConfigToast && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-700 text-emerald-200 rounded-xl text-xs flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {birthdayConfigToast}
                </span>
                <button onClick={() => setBirthdayConfigToast(null)} className="text-emerald-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Birthday Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Issued Coupons</span>
                <span className="text-2xl font-bold text-amber-400 tabular-nums">
                  {birthdayStats?.total_coupons_issued || birthdayCoupons.length}
                </span>
                <span className="text-[10px] text-stone-500 block">Annual celebratory coupons</span>
              </div>

              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Redeemed Coupons</span>
                <span className="text-2xl font-bold text-emerald-400 tabular-nums">
                  {birthdayStats?.total_coupons_redeemed || birthdayCoupons.filter((c) => c.status === 'redeemed').length}
                </span>
                <span className="text-[10px] text-stone-500 block">Single-use redemptions</span>
              </div>

              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Redemption Rate</span>
                <span className="text-2xl font-bold text-white tabular-nums">
                  {birthdayStats?.redemption_rate || '0%'}
                </span>
                <span className="text-[10px] text-stone-500 block">Customer birthday engagement</span>
              </div>

              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">Upcoming Birthdays</span>
                <span className="text-2xl font-bold text-orange-400 tabular-nums">
                  {birthdayStats?.birthdays_upcoming_3days_count || 0}
                </span>
                <span className="text-[10px] text-stone-500 block">Next 3 days celebrations</span>
              </div>
            </div>

            {/* Birthday Offer Settings Form */}
            {birthdayConfig && (
              <div className="p-6 bg-stone-950 rounded-2xl border border-stone-800 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-850 pb-4">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                      <Gift className="w-5 h-5 text-amber-400" />
                      Automatic Birthday Offer Rules
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Configure celebratory discounts, validity windows, and terms automatically granted to patrons.
                    </p>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-xl">
                    <input
                      type="checkbox"
                      checked={birthdayConfig.is_active}
                      onChange={(e) => setBirthdayConfig({ ...birthdayConfig, is_active: e.target.checked })}
                      className="rounded text-amber-500"
                    />
                    <span className="text-xs font-bold text-white">
                      {birthdayConfig.is_active ? 'Status: Active ✓' : 'Status: Disabled'}
                    </span>
                  </label>
                </div>

                <form onSubmit={handleSaveBirthdayConfig} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-stone-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                        Offer Type
                      </label>
                      <select
                        value={birthdayConfig.offer_type}
                        onChange={(e) =>
                          setBirthdayConfig({
                            ...birthdayConfig,
                            offer_type: e.target.value as any,
                          })
                        }
                        className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-white"
                      >
                        <option value="percentage">Percentage Discount (% OFF)</option>
                        <option value="fixed">Fixed Rupee Discount (₹ OFF)</option>
                        <option value="free_item">Complimentary Free Dish</option>
                      </select>
                    </div>

                    {birthdayConfig.offer_type === 'percentage' && (
                      <div>
                        <label className="block text-stone-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                          Discount Percentage (%)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={birthdayConfig.discount_percentage}
                          onChange={(e) =>
                            setBirthdayConfig({
                              ...birthdayConfig,
                              discount_percentage: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-white font-mono"
                        />
                      </div>
                    )}

                    {birthdayConfig.offer_type === 'fixed' && (
                      <div>
                        <label className="block text-stone-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                          Fixed Discount Amount (₹)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={birthdayConfig.fixed_discount_amount}
                          onChange={(e) =>
                            setBirthdayConfig({
                              ...birthdayConfig,
                              fixed_discount_amount: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-white font-mono"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-stone-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                        Minimum Order Value (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={birthdayConfig.min_order_value}
                        onChange={(e) =>
                          setBirthdayConfig({
                            ...birthdayConfig,
                            min_order_value: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-stone-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                        Max Discount Cap (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={birthdayConfig.max_discount_cap}
                        onChange={(e) =>
                          setBirthdayConfig({
                            ...birthdayConfig,
                            max_discount_cap: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                        Validity Days Before Birthday
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={birthdayConfig.validity_days_before}
                        onChange={(e) =>
                          setBirthdayConfig({
                            ...birthdayConfig,
                            validity_days_before: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                        Validity Days After Birthday
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={birthdayConfig.validity_days_after}
                        onChange={(e) =>
                          setBirthdayConfig({
                            ...birthdayConfig,
                            validity_days_after: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                      Complimentary Free Item Name
                    </label>
                    <input
                      type="text"
                      value={birthdayConfig.free_item_name}
                      onChange={(e) =>
                        setBirthdayConfig({
                          ...birthdayConfig,
                          free_item_name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-white"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingBirthdayConfig}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {savingBirthdayConfig ? 'Saving Settings...' : 'Save Birthday Offer Rules'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Issued Birthday Coupons & Redemption History Table */}
            <div className="bg-stone-950 rounded-xl border border-stone-800 overflow-hidden space-y-3 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif font-bold text-white text-base">Issued Birthday Coupons & Redemption Log</h4>
                  <p className="text-xs text-stone-500">Every coupon is single-use and prevented from duplicate redemption.</p>
                </div>
                <span className="text-xs text-stone-400 font-mono">
                  {birthdayCoupons.length} coupons recorded
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-300">
                  <thead className="bg-stone-900 text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-800">
                    <tr>
                      <th className="py-3 px-3">Coupon Code</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Offer Type</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Redeemed Order</th>
                      <th className="py-3 px-3">Valid Until</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850">
                    {birthdayCoupons.map((coupon) => (
                      <tr key={coupon.id} className="hover:bg-stone-900/60">
                        <td className="py-3 px-3 font-mono font-bold text-amber-400">
                          {coupon.code}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-white block">{coupon.customer_name}</span>
                          <span className="text-[10px] text-stone-500 font-mono">+91 {coupon.customer_phone}</span>
                        </td>
                        <td className="py-3 px-3 capitalize">
                          {coupon.offer_type === 'percentage'
                            ? `${coupon.discount_value}% OFF`
                            : `₹${coupon.discount_value} OFF`}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              coupon.status === 'redeemed'
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                                : coupon.status === 'expired'
                                ? 'bg-stone-850 text-stone-500'
                                : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {coupon.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {coupon.redeemed_order_number ? (
                            <span className="text-emerald-400 font-bold">
                              #{coupon.redeemed_order_number}
                            </span>
                          ) : (
                            <span className="text-stone-600">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-stone-400 text-[11px]">
                          {new Date(coupon.valid_until).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 8: OWNER-ONLY SECURE API KEY SETTINGS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'api-settings' && (
          <div className="space-y-6">
            {/* Toast Alert */}
            {apiToast && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-md animate-fade-in ${
                  apiToast.type === 'success'
                    ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                    : 'bg-red-950/80 border-red-700 text-red-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {apiToast.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span className="font-medium">{apiToast.message}</span>
                </div>
                <button
                  onClick={() => setApiToast(null)}
                  className="text-stone-400 hover:text-white p-1 rounded hover:bg-white/10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Header & Security Guarantee Banner */}
            <div className="p-5 bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 rounded-2xl border border-amber-600/40 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold font-serif text-white tracking-wide">
                        Owner API Key & Secret Management
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Owner Only
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Encrypted server-side storage with AES-256-GCM. Live payment, WhatsApp, and database keys.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchApiSettings}
                    disabled={loadingApiSettings}
                    className="px-3 py-1.5 bg-stone-850 hover:bg-stone-800 text-stone-300 rounded-lg text-xs font-semibold border border-stone-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${loadingApiSettings ? 'animate-spin' : ''}`} />
                    <span>Refresh Status</span>
                  </button>
                </div>
              </div>

              {/* Security Shield Note */}
              <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl flex items-start gap-3 text-xs text-amber-200/90 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Security Guarantee: </strong>
                  API keys and secrets are encrypted on the server using AES-256-GCM with SHA-256 authenticated tags. Raw secrets are never sent to browser clients, stored in local storage, or printed in application logs. Masked placeholders (<code className="text-amber-300 font-mono">••••</code>) prevent shoulder-surfing. Only verified owners can view or update these settings.
                </div>
              </div>
            </div>

            {/* Provider Selection Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                {
                  key: 'razorpay' as ApiProviderKey,
                  name: 'Razorpay Gateway',
                  icon: CreditCard,
                  desc: 'UPI & Card Checkout',
                },
                {
                  key: 'whatsapp' as ApiProviderKey,
                  name: 'WhatsApp Cloud API',
                  icon: MessageCircle,
                  desc: 'Order Alerts via Meta',
                },
                {
                  key: 'smtp' as ApiProviderKey,
                  name: 'Email SMTP',
                  icon: Send,
                  desc: 'Password Resets & Reports',
                },
                {
                  key: 'supabase' as ApiProviderKey,
                  name: 'Supabase Cloud DB',
                  icon: Database,
                  desc: 'PostgreSQL Sync',
                },
                {
                  key: 'google_maps' as ApiProviderKey,
                  name: 'Google Maps API',
                  icon: MapPin,
                  desc: 'Delivery Geocoding',
                },
              ].map((p) => {
                const conf = apiConfigs.find((c) => c.provider === p.key);
                const isSelected = selectedApiProvider === p.key;
                const isConfigured = conf && Object.values(conf.has_credentials || {}).some(Boolean);
                const isEnabled = conf?.is_enabled;
                const testStatus = conf?.test_status;

                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      setSelectedApiProvider(p.key);
                      setApiFormData({});
                      setApiTestResult(null);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-stone-900 border-amber-500 shadow-md ring-1 ring-amber-500/40'
                        : 'bg-stone-950/80 border-stone-850 hover:border-stone-700 hover:bg-stone-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <p.icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-stone-400'}`} />
                        <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-stone-200'}`}>
                          {p.name}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[11px] text-stone-400 line-clamp-1">{p.desc}</p>
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {/* Enabled / Disabled status */}
                        {isConfigured ? (
                          isEnabled ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                              ENABLED
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                              DISABLED
                            </span>
                          )
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-stone-900 text-stone-500 border border-stone-800">
                            UNCONFIGURED
                          </span>
                        )}

                        {/* Test Status Pill */}
                        {testStatus === 'success' && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                            ✓ Verified
                          </span>
                        )}
                        {testStatus === 'failed' && (
                          <span className="text-[10px] text-red-400 flex items-center gap-0.5">
                            ✗ Failed
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Provider Details & Edit Form */}
            {(() => {
              const currentConfig = apiConfigs.find((c) => c.provider === selectedApiProvider) || {
                provider: selectedApiProvider,
                is_enabled: false,
                masked_credentials: {},
                has_credentials: {},
                updated_at: new Date().toISOString(),
                test_status: 'untested',
              };

              // Provider field configurations
              const providerFields = {
                razorpay: [
                  {
                    key: 'key_id',
                    label: 'Razorpay Key ID',
                    placeholder: 'rzp_live_... or rzp_test_...',
                    isSecret: false,
                    help: 'Your public identifier key from Razorpay Dashboard.',
                  },
                  {
                    key: 'key_secret',
                    label: 'Razorpay Key Secret',
                    placeholder: 'Enter Key Secret to update...',
                    isSecret: true,
                    help: 'Private API secret used for payment signature verification (never shared with browsers).',
                  },
                  {
                    key: 'webhook_secret',
                    label: 'Razorpay Webhook Secret (Optional)',
                    placeholder: 'Enter Webhook Secret...',
                    isSecret: true,
                    help: 'Used to verify webhook payloads if configured in Razorpay Settings.',
                  },
                ],
                whatsapp: [
                  {
                    key: 'phone_number_id',
                    label: 'WhatsApp Phone Number ID',
                    placeholder: 'e.g. 104829104857291',
                    isSecret: false,
                    help: 'From Meta Developer App -> WhatsApp -> API Setup.',
                  },
                  {
                    key: 'access_token',
                    label: 'System User Permanent Access Token',
                    placeholder: 'EAAG...',
                    isSecret: true,
                    help: 'Permanent system user token with whatsapp_business_messaging permissions.',
                  },
                  {
                    key: 'recipient_phone',
                    label: 'Restaurant Owner Alert Phone Number',
                    placeholder: 'e.g. 919701576804 (with country code)',
                    isSecret: false,
                    help: 'The owner WhatsApp number where incoming orders will be sent.',
                  },
                ],
                smtp: [
                  {
                    key: 'smtp_host',
                    label: 'SMTP Host',
                    placeholder: 'smtp.gmail.com',
                    isSecret: false,
                    help: 'SMTP server hostname (e.g. smtp.gmail.com or sendgrid.net).',
                  },
                  {
                    key: 'smtp_port',
                    label: 'SMTP Port',
                    placeholder: '587 (TLS) or 465 (SSL)',
                    isSecret: false,
                    help: 'Port 587 with STARTTLS or Port 465 with direct SSL.',
                  },
                  {
                    key: 'smtp_user',
                    label: 'SMTP Username / Email',
                    placeholder: 'ranjithlakkakula2006@gmail.com',
                    isSecret: false,
                    help: 'Email address used to authenticate with the SMTP server.',
                  },
                  {
                    key: 'smtp_pass',
                    label: 'SMTP Password / Google App Password',
                    placeholder: 'Enter 16-character App Password...',
                    isSecret: true,
                    help: 'For Gmail: Generate a 16-character Google App Password in your Google Account Security.',
                  },
                  {
                    key: 'smtp_from',
                    label: 'Sender Display Header (From)',
                    placeholder: '"Sri Sathya Sai Mess" <no-reply@srisathyasaimess.com>',
                    isSecret: false,
                    help: 'The name and address displayed on outgoing emails.',
                  },
                ],
                supabase: [
                  {
                    key: 'supabase_url',
                    label: 'Supabase Project URL',
                    placeholder: 'https://xxxxxxxx.supabase.co',
                    isSecret: false,
                    help: 'Found under Supabase Dashboard -> Project Settings -> API.',
                  },
                  {
                    key: 'supabase_anon_key',
                    label: 'Supabase Anon / Public Key',
                    placeholder: 'eyJhbGciOiJIUzI1Ni...',
                    isSecret: false,
                    help: 'Public client key.',
                  },
                  {
                    key: 'supabase_service_role_key',
                    label: 'Supabase Service Role Secret Key',
                    placeholder: 'Enter service_role secret key to update...',
                    isSecret: true,
                    help: 'Super-admin key that bypasses RLS for server-side order and menu syncing. Never exposed to clients.',
                  },
                ],
                google_maps: [
                  {
                    key: 'google_maps_api_key',
                    label: 'Google Maps API Key',
                    placeholder: 'AIzaSy...',
                    isSecret: true,
                    help: 'Used for geocoding customer addresses and directions on kitchen tickets.',
                  },
                ],
              }[selectedApiProvider] || [];

              return (
                <div className="bg-stone-950 rounded-2xl border border-stone-800 p-6 space-y-6 shadow-xl">
                  {/* Provider Header Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-850 gap-4">
                    <div>
                      <h4 className="font-serif font-bold text-white text-base sm:text-lg capitalize flex items-center gap-2">
                        <span>{selectedApiProvider.replace(/_/g, ' ').toUpperCase()} Configuration</span>
                        {currentConfig.is_enabled ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                            Active & Enabled
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-800 text-stone-400 border border-stone-700">
                            Disabled / Inactive
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-stone-400 mt-1">
                        Last updated:{' '}
                        <span className="text-stone-300 font-mono">
                          {currentConfig.updated_at
                            ? new Date(currentConfig.updated_at).toLocaleString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Not configured'}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Enable/Disable Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleApi(selectedApiProvider, currentConfig.is_enabled)}
                        disabled={isTogglingApi}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                          currentConfig.is_enabled
                            ? 'bg-amber-950/60 hover:bg-amber-900 border border-amber-700 text-amber-200'
                            : 'bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700 text-emerald-200'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{currentConfig.is_enabled ? 'Disable Integration' : 'Enable Integration'}</span>
                      </button>

                      {/* Test Connection Button */}
                      <button
                        type="button"
                        onClick={() => handleTestApi(selectedApiProvider)}
                        disabled={isTestingApi}
                        className="px-3.5 py-2 bg-stone-850 hover:bg-stone-800 border border-stone-700 hover:border-amber-500/60 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isTestingApi ? 'animate-spin' : ''}`} />
                        <span>{isTestingApi ? 'Testing Connection...' : 'Test Connection'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Test Result Message Box */}
                  {(apiTestResult || currentConfig.test_message) && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                        (apiTestResult ? apiTestResult.success : currentConfig.test_status === 'success')
                          ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200'
                          : 'bg-red-950/50 border-red-800 text-red-200'
                      }`}
                    >
                      {(apiTestResult ? apiTestResult.success : currentConfig.test_status === 'success') ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-0.5">
                        <span className="font-bold block">
                          {(apiTestResult ? apiTestResult.success : currentConfig.test_status === 'success')
                            ? 'Connection Test Succeeded'
                            : 'Connection Test Failed'}
                        </span>
                        <p className="leading-relaxed">
                          {apiTestResult ? apiTestResult.message : currentConfig.test_message}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Key Management Form */}
                  <form onSubmit={handleSaveApi} className="space-y-4">
                    <div className="space-y-4">
                      {providerFields.map((f) => {
                        const hasExisting = Boolean(currentConfig.has_credentials?.[f.key]);
                        const maskedVal = currentConfig.masked_credentials?.[f.key];
                        const showSecret = showSecretField[f.key];

                        return (
                          <div key={f.key} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="block text-xs font-bold text-stone-200">
                                {f.label}
                              </label>
                              {hasExisting && (
                                <span className="text-[11px] text-amber-300 font-mono bg-stone-900 px-2 py-0.5 rounded border border-stone-800 flex items-center gap-1">
                                  <Lock className="w-3 h-3 text-emerald-400" />
                                  <span>Saved: {maskedVal}</span>
                                </span>
                              )}
                            </div>

                            <div className="relative">
                              <input
                                type={f.isSecret && !showSecret ? 'password' : 'text'}
                                value={apiFormData[f.key] || ''}
                                onChange={(e) =>
                                  setApiFormData({
                                    ...apiFormData,
                                    [f.key]: e.target.value,
                                  })
                                }
                                placeholder={
                                  hasExisting
                                    ? 'Leave blank to keep existing encrypted secret'
                                    : f.placeholder
                                }
                                className="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-800 focus:border-amber-500 rounded-xl text-white text-xs font-mono placeholder:text-stone-500 transition-colors pr-10"
                              />

                              {f.isSecret && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowSecretField({
                                      ...showSecretField,
                                      [f.key]: !showSecret,
                                    })
                                  }
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white p-1 rounded"
                                  title={showSecret ? 'Hide secret' : 'Show secret'}
                                >
                                  {showSecret ? (
                                    <EyeOff className="w-3.5 h-3.5" />
                                  ) : (
                                    <Eye className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>

                            <p className="text-[11px] text-stone-400">{f.help}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 border-t border-stone-850 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div>
                        {Object.values(currentConfig.has_credentials || {}).some(Boolean) && (
                          <button
                            type="button"
                            onClick={() => setApiDeleteConfirmProvider(selectedApiProvider)}
                            className="text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/40 px-3 py-2 rounded-lg border border-red-900/60 transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Stored Configuration</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="submit"
                          disabled={isSavingApi}
                          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isSavingApi ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Encrypting & Saving...</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-4 h-4" />
                              <span>Save / Update API Keys</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DRAWER: SINGLE ORDER DETAILS & ACTIONS */}
      {/* ------------------------------------------------------------- */}
      {selectedOrder && (
        <div className="fixed inset-0 z-60 overflow-hidden">
          <div
            className="absolute inset-0 bg-stone-950/70 backdrop-blur-xs"
            onClick={() => setSelectedOrder(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-lg bg-stone-900 border-l border-stone-800 text-stone-100 flex flex-col justify-between shadow-2xl">
              {/* Header */}
              <div className="p-5 border-b border-stone-800 bg-stone-950 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-400 block">
                    Order Details
                  </span>
                  <h3 className="text-lg font-bold font-mono text-white">
                    #{selectedOrder.order_number}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-850 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
                {/* Status Switcher Action Buttons */}
                <div className="space-y-2 p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <span className="font-bold text-stone-400 uppercase tracking-wider text-[10px] block">
                    Update Kitchen Lifecycle Status
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'confirmed')}
                      className={`p-2 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                        selectedOrder.order_status === 'confirmed'
                          ? 'bg-amber-500 text-stone-950'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                      }`}
                    >
                      Confirm Order
                    </button>
                    <button
                      onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'preparing')}
                      className={`p-2 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                        selectedOrder.order_status === 'preparing'
                          ? 'bg-amber-500 text-stone-950'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                      }`}
                    >
                      Mark Preparing
                    </button>
                    <button
                      onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'out_for_delivery')}
                      className={`p-2 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                        selectedOrder.order_status === 'out_for_delivery'
                          ? 'bg-blue-500 text-white'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                      }`}
                    >
                      Out for Delivery
                    </button>
                    <button
                      onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'delivered')}
                      className={`p-2 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                        selectedOrder.order_status === 'delivered'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                      }`}
                    >
                      Mark Delivered
                    </button>
                  </div>
                  <button
                    onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'cancelled')}
                    className="w-full mt-1 py-1.5 text-center text-red-400 hover:text-red-300 text-xs font-semibold hover:bg-red-950/20 rounded cursor-pointer transition-colors"
                  >
                    Reject / Cancel Order
                  </button>
                </div>

                {/* Customer Contact */}
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
                  <span className="font-bold text-stone-400 uppercase tracking-wider text-[10px] block">
                    Customer Information
                  </span>
                  <div className="space-y-1">
                    <p className="font-bold text-white text-sm">{selectedOrder.customer_name}</p>
                    <div className="flex items-center gap-3 pt-1">
                      <a
                        href={`tel:${selectedOrder.customer_phone}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-md text-xs"
                      >
                        <Phone className="w-3.5 h-3.5 text-amber-400" />
                        <span>Call Customer</span>
                      </a>
                      <a
                        href={`https://api.whatsapp.com/send?phone=91${selectedOrder.customer_phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded-md text-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>WhatsApp Chat</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Delivery Location & Map Pin */}
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-400 uppercase tracking-wider text-[10px]">
                      Delivery Address
                    </span>
                    {selectedOrder.google_maps_url ? (
                      <a
                        href={selectedOrder.google_maps_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 font-bold hover:underline flex items-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Open in Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-stone-500">
                        GPS pin not granted
                      </span>
                    )}
                  </div>
                  <p className="text-stone-300 leading-relaxed">
                    {selectedOrder.delivery_address}
                  </p>
                  {selectedOrder.customer_latitude && selectedOrder.customer_longitude && (
                    <p className="text-[10px] text-stone-500 tabular-nums">
                      Coordinates: {selectedOrder.customer_latitude.toFixed(6)},{' '}
                      {selectedOrder.customer_longitude.toFixed(6)}
                    </p>
                  )}
                  {selectedOrder.notes && (
                    <div className="mt-2 p-2 bg-stone-900 rounded border border-stone-800 text-amber-200">
                      <strong>Cooking Note:</strong> {selectedOrder.notes}
                    </div>
                  )}
                </div>

                {/* Payment & Transaction Verification */}
                <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                      Payment & Transaction Details
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        selectedOrder.payment_status === 'paid'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                          : selectedOrder.payment_status === 'failed'
                          ? 'bg-red-950/80 text-red-400 border border-red-800'
                          : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {selectedOrder.payment_status === 'paid'
                        ? 'PAID ✓ (Verified)'
                        : selectedOrder.payment_status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 bg-stone-900 rounded border border-stone-800">
                      <span className="text-stone-500 block text-[10px]">Payment Method</span>
                      <span className="font-bold text-white">
                        {selectedOrder.payment_method === 'razorpay_online'
                          ? 'Razorpay Online (UPI/Cards)'
                          : 'Cash on Delivery (COD)'}
                      </span>
                    </div>

                    <div className="p-2 bg-stone-900 rounded border border-stone-800">
                      <span className="text-stone-500 block text-[10px]">Amount Paid / Payable</span>
                      <span className="font-bold text-amber-400 font-mono">₹{selectedOrder.final_total}.00</span>
                    </div>
                  </div>

                  {/* Razorpay Transaction IDs if available */}
                  {selectedOrder.razorpay_payment_id && (
                    <div className="space-y-1.5 pt-1 border-t border-stone-850 text-[11px]">
                      <div className="flex items-center justify-between bg-stone-900/90 p-2 rounded border border-stone-800">
                        <div>
                          <span className="text-stone-500 text-[10px] block">Razorpay Payment ID</span>
                          <span className="font-mono text-emerald-400 font-bold text-xs select-all">
                            {selectedOrder.razorpay_payment_id}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyId(selectedOrder.razorpay_payment_id!)}
                          className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-[10px] font-semibold cursor-pointer"
                        >
                          {copiedId === selectedOrder.razorpay_payment_id ? 'Copied!' : 'Copy'}
                        </button>
                      </div>

                      {selectedOrder.razorpay_order_id && (
                        <div className="flex items-center justify-between bg-stone-900/90 p-2 rounded border border-stone-800">
                          <div>
                            <span className="text-stone-500 text-[10px] block">Razorpay Order ID</span>
                            <span className="font-mono text-blue-400 font-bold text-xs select-all">
                              {selectedOrder.razorpay_order_id}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyId(selectedOrder.razorpay_order_id!)}
                            className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-[10px] font-semibold cursor-pointer"
                          >
                            {copiedId === selectedOrder.razorpay_order_id ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Owner Payment Status Control (e.g. mark COD as Paid) */}
                  <div className="pt-2 border-t border-stone-850 flex items-center justify-between">
                    <span className="text-stone-400 text-[10px]">Change Payment Status:</span>
                    <div className="flex items-center gap-1.5">
                      {selectedOrder.payment_status !== 'paid' && (
                        <button
                          onClick={() => handleUpdatePaymentStatus(selectedOrder.id, 'paid')}
                          className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded text-[10px] font-bold cursor-pointer"
                        >
                          Mark as Paid ✓
                        </button>
                      )}
                      {selectedOrder.payment_status !== 'pending' && (
                        <button
                          onClick={() => handleUpdatePaymentStatus(selectedOrder.id, 'pending')}
                          className="px-2.5 py-1 bg-stone-850 hover:bg-stone-800 border border-stone-700 text-stone-300 rounded text-[10px] font-bold cursor-pointer"
                        >
                          Mark as Pending
                        </button>
                      )}
                      {selectedOrder.payment_status !== 'refunded' && (
                        <button
                          onClick={() => handleUpdatePaymentStatus(selectedOrder.id, 'refunded')}
                          className="px-2.5 py-1 bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 rounded text-[10px] font-bold cursor-pointer"
                        >
                          Refund
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ordered Items List */}
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
                  <span className="font-bold text-stone-400 uppercase tracking-wider text-[10px] block">
                    Food Items ({selectedOrder.items.length})
                  </span>
                  <div className="divide-y divide-stone-800">
                    {selectedOrder.items.map((i, idx) => (
                      <div key={idx} className="py-2 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-white block">{i.item_name}</span>
                          <span className="text-stone-400 text-[11px]">
                            ₹{i.unit_price} × {i.quantity}
                          </span>
                        </div>
                        <span className="font-bold text-white tabular-nums">
                          ₹{i.total_price}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-stone-800 space-y-1 text-stone-400">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="tabular-nums text-white">₹{selectedOrder.subtotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Charge</span>
                      <span className="tabular-nums text-white">
                        {selectedOrder.delivery_fee === 0 ? 'FREE' : `₹${selectedOrder.delivery_fee}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-amber-400 pt-1 border-t border-stone-800">
                      <span>Total</span>
                      <span className="tabular-nums">₹{selectedOrder.final_total}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD / EDIT FOOD ITEM */}
      {/* ------------------------------------------------------------- */}
      {isAddItemModalOpen && (
        <AddItemModal
          item={editingItem}
          categories={categories}
          token={token!}
          onClose={() => {
            setIsAddItemModalOpen(false);
            setEditingItem(null);
          }}
          onSuccess={() => {
            setIsAddItemModalOpen(false);
            setEditingItem(null);
            onRefreshMenu();
          }}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD FOOD CATEGORY */}
      {/* ------------------------------------------------------------- */}
      {isAddCategoryModalOpen && (
        <AddCategoryModal
          token={token!}
          onClose={() => setIsAddCategoryModalOpen(false)}
          onSuccess={() => {
            setIsAddCategoryModalOpen(false);
            onRefreshMenu();
          }}
        />
      )}
      {/* ------------------------------------------------------------- */}
      {/* MODAL: CUSTOMER ORDER HISTORY (ADMIN VIEW) */}
      {/* ------------------------------------------------------------- */}
      {selectedCustomerOrdersModal && (
        <div className="fixed inset-0 z-70 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col text-stone-100 shadow-2xl overflow-hidden">
            <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 block">Customer Order History</span>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{selectedCustomerOrdersModal.customer.full_name}</span>
                  <span className="text-xs font-mono text-stone-400">(+91 {selectedCustomerOrdersModal.customer.phone})</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedCustomerOrdersModal(null)}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              <div className="flex items-center gap-4 text-stone-400 pb-2 border-b border-stone-800">
                <span>Email: <strong className="text-stone-200">{selectedCustomerOrdersModal.customer.email}</strong></span>
                <span>•</span>
                <span>Date of Birth: <strong className="text-amber-400">🎂 {selectedCustomerOrdersModal.customer.date_of_birth}</strong></span>
              </div>

              {selectedCustomerOrdersModal.orders.length === 0 ? (
                <div className="p-8 text-center text-stone-500">
                  This customer has not placed any orders yet.
                </div>
              ) : (
                selectedCustomerOrdersModal.orders.map((ord) => (
                  <div key={ord.id} className="p-3.5 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400">#{ord.order_number}</span>
                        <span className="text-stone-500 text-[11px]">
                          {new Date(ord.created_at).toLocaleString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-800 text-stone-300">
                          {ord.order_status.replace(/_/g, ' ')}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ord.payment_status === 'paid' ? 'bg-emerald-950 text-emerald-400' : 'bg-stone-800 text-stone-400'
                        }`}>
                          {ord.payment_status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-stone-300">
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-[11px]">
                          <span>{it.quantity}x {it.item_name}</span>
                          <span className="font-mono">₹{it.total_price}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-stone-850 flex justify-between items-center text-xs">
                      <span className="text-stone-500 truncate max-w-xs">{ord.delivery_address}</span>
                      <span className="font-bold text-white">
                        Total: <span className="font-mono text-amber-400">₹{ord.final_total}</span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* ------------------------------------------------------------- */}
      {/* CONFIRMATION MODAL: CLOSE RESTAURANT TODAY */}
      {/* ------------------------------------------------------------- */}
      {isCloseConfirmOpen && (
        <div className="fixed inset-0 z-70 bg-stone-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-red-700/80 rounded-2xl w-full max-w-md p-6 text-stone-100 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-600/40 text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-serif">
                  Close Restaurant Today
                </h3>
                <span className="text-[11px] text-red-300 font-mono">
                  Date: {statusData?.today_ist || 'Today'} (Asia/Kolkata IST)
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl space-y-2">
              <p className="text-sm font-semibold text-white">
                Are you sure you want to close the restaurant for today?
              </p>
              <ul className="text-xs text-stone-300 space-y-1.5 list-disc list-inside">
                <li>Immediately displays <strong className="text-amber-300">"Restaurant Will Be Closed Today"</strong> announcement across homepage, menu, and checkout.</li>
                <li>Disables "Add to Cart" and "Place Order" buttons for all customers.</li>
                <li>Prevents coupon redemption and payment checkouts.</li>
                <li>Past order history and customer account access remain active.</li>
                <li>Automatically resets and reopens tomorrow at 00:00 IST.</li>
              </ul>
            </div>

            {closureActionError && (
              <div className="p-2.5 bg-red-950 border border-red-700 rounded-lg text-xs text-red-200">
                {closureActionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCloseConfirmOpen(false)}
                disabled={isTogglingClosure}
                className="px-4 py-2 text-xs font-semibold text-stone-300 hover:text-white hover:bg-stone-800 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCloseToday}
                disabled={isTogglingClosure}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isTogglingClosure ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Closing...</span>
                  </>
                ) : (
                  <>
                    <Power className="w-3.5 h-3.5" />
                    <span>Yes, Close Restaurant Today</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CONFIRMATION MODAL: REOPEN RESTAURANT TODAY */}
      {/* ------------------------------------------------------------- */}
      {isReopenConfirmOpen && (
        <div className="fixed inset-0 z-70 bg-stone-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-emerald-700/80 rounded-2xl w-full max-w-md p-6 text-stone-100 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-600/40 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-serif">
                  Reopen Restaurant Today
                </h3>
                <span className="text-[11px] text-emerald-300 font-mono">
                  Date: {statusData?.today_ist || 'Today'} (Asia/Kolkata IST)
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/60 rounded-xl space-y-2">
              <p className="text-sm font-semibold text-white">
                Are you sure you want to reopen the restaurant for today?
              </p>
              <ul className="text-xs text-stone-300 space-y-1.5 list-disc list-inside">
                <li>Removes the closure announcement across all customer screens.</li>
                <li>Re-enables "Add to Cart" and checkout buttons immediately.</li>
                <li>Allows customers to place online orders and use payment methods.</li>
              </ul>
            </div>

            {closureActionError && (
              <div className="p-2.5 bg-red-950 border border-red-700 rounded-lg text-xs text-red-200">
                {closureActionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsReopenConfirmOpen(false)}
                disabled={isTogglingClosure}
                className="px-4 py-2 text-xs font-semibold text-stone-300 hover:text-white hover:bg-stone-800 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReopenToday}
                disabled={isTogglingClosure}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isTogglingClosure ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Reopening...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Yes, Reopen Restaurant Today</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ------------------------------------------------------------- */}
      {/* MODAL: DELETE API CONFIGURATION CONFIRMATION */}
      {/* ------------------------------------------------------------- */}
      {apiDeleteConfirmProvider && (
        <div className="fixed inset-0 z-70 bg-stone-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-red-700/80 rounded-2xl w-full max-w-md p-6 text-stone-100 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-600/40 text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-serif">
                  Delete {apiDeleteConfirmProvider.toUpperCase()} Credentials?
                </h3>
                <span className="text-[11px] text-red-300">
                  Permanent removal from encrypted vault
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl space-y-2">
              <p className="text-sm font-semibold text-white">
                Are you sure you want to delete this integration's API configuration?
              </p>
              <ul className="text-xs text-stone-300 space-y-1.5 list-disc list-inside">
                <li>Permanently wipes encrypted keys from server-side vault storage.</li>
                <li>Reverts this provider to unconfigured / sandbox mode.</li>
                <li>Cannot be undone without re-entering the original credentials.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setApiDeleteConfirmProvider(null)}
                disabled={isDeletingApi}
                className="px-4 py-2 text-xs font-semibold text-stone-300 hover:text-white hover:bg-stone-800 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteApi}
                disabled={isDeletingApi}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingApi ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete API Configuration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component: Add or Edit Item Modal
const AddItemModal: React.FC<{
  item: FoodItem | null;
  categories: FoodCategory[];
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ item, categories, token, onClose, onSuccess }) => {
  const [name, setName] = useState(item ? item.name : '');
  const [categoryId, setCategoryId] = useState(item ? item.category_id : categories[0]?.id || '');
  const [description, setDescription] = useState(item ? item.description : '');
  const [price, setPrice] = useState(item ? item.price.toString() : '');
  const [imageUrl, setImageUrl] = useState(item ? item.image_url : '');
  const [isVeg, setIsVeg] = useState(item ? item.is_veg : false);
  const [isAvailable, setIsAvailable] = useState(item ? item.is_available : true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError('Please provide a valid price in INR');
      return;
    }

    const matchedCategory = categories.find((c) => c.id === categoryId);
    const categoryName = matchedCategory ? matchedCategory.name : 'Curry';

    setIsSaving(true);
    try {
      const payload = {
        name,
        category_id: categoryId,
        category_name: categoryName,
        description,
        price: parsedPrice,
        image_url: imageUrl || '/src/assets/images/dish_south_indian_meals_1792160842617.jpg',
        is_veg: isVeg,
        is_available: isAvailable,
      };

      const url = item ? `/api/menu/items/${item.id}` : '/api/menu/items';
      const method = item ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save food item');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error occurred');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md p-6 text-stone-100 shadow-2xl space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-stone-800">
          <h3 className="text-base font-bold text-white">
            {item ? 'Edit Food Item' : 'Add New Food Item'}
          </h3>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-red-950/60 border border-red-800 rounded text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div>
            <label className="block text-stone-400 font-semibold mb-1">Item Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Telangana Mutton Chukka"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-400 font-semibold mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-stone-400 font-semibold mb-1">Price (₹ INR)</label>
              <input
                type="number"
                required
                min="1"
                placeholder="220"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-white tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-stone-400 font-semibold mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Flavor profile, spices, ingredients..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-stone-400 font-semibold mb-1">Image URL / Path</label>
            <input
              type="text"
              placeholder="/src/assets/images/... or https://"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-white text-[11px]"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isVeg}
                onChange={(e) => setIsVeg(e.target.checked)}
                className="rounded text-amber-500"
              />
              <span className="text-stone-300">Pure Vegetarian</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="rounded text-amber-500"
              />
              <span className="text-stone-300">In Stock & Available</span>
            </label>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Sub-component: Add Category Modal
const AddCategoryModal: React.FC<{
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ token, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/menu/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create category');
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error occurred');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm p-5 text-stone-100 shadow-2xl space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-stone-800">
          <h3 className="text-sm font-bold text-white">Add Food Category</h3>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2 bg-red-950/60 border border-red-800 rounded text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div>
            <label className="block text-stone-400 font-semibold mb-1">Category Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Fish Fry & Curries"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-stone-400 font-semibold mb-1">Description</label>
            <input
              type="text"
              placeholder="Brief summary..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-white"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-stone-800 text-stone-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg cursor-pointer"
            >
              {isSaving ? 'Adding...' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
