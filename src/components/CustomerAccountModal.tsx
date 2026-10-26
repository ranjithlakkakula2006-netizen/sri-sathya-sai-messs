import React, { useState, useEffect } from 'react';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useCart } from '../context/CartContext';
import { useRestaurantStatus } from '../context/RestaurantStatusContext';
import { Order } from '../types/restaurant';
import {
  X,
  Package,
  Calendar,
  Gift,
  Phone,
  Mail,
  User,
  Clock,
  RotateCcw,
  Check,
  Copy,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  LogOut,
  MapPin,
  Tag,
  AlertCircle
} from 'lucide-react';

export const CustomerAccountModal: React.FC = () => {
  const {
    customer,
    token,
    isAccountModalOpen,
    accountModalTab,
    closeAccountModal,
    openAccountModal,
    birthdayOffer,
    logout,
  } = useCustomerAuth();

  const { reorderItems } = useCart();
  const { isClosedToday } = useRestaurantStatus();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [reorderedId, setReorderedId] = useState<string | null>(null);

  useEffect(() => {
    if (isAccountModalOpen && token) {
      fetchCustomerOrders();
    }
  }, [isAccountModalOpen, token]);

  const fetchCustomerOrders = async () => {
    if (!token) return;
    setLoadingOrders(true);
    setOrderError(null);
    try {
      const res = await fetch('/api/customer/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      } else {
        setOrderError('Unable to load past orders.');
      }
    } catch (e: any) {
      setOrderError(e.message || 'Network error fetching orders');
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(true);
    setTimeout(() => setCopiedCoupon(false), 2500);
  };

  const handleReorder = (order: Order) => {
    if (!order.items || order.items.length === 0) return;
    setReorderedId(order.id);
    const reorderPayload = order.items.map((i) => ({
      food_item_id: i.food_item_id,
      item_name: i.item_name,
      unit_price: i.unit_price,
      quantity: i.quantity,
    }));
    reorderItems(reorderPayload);
    closeAccountModal();
  };

  if (!isAccountModalOpen || !customer) return null;

  const bdayStatus = birthdayOffer?.birthday_status;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Profile Bar */}
        <div className="bg-gradient-to-r from-amber-800 via-amber-900 to-stone-900 px-6 py-5 text-white flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-amber-600/40 border border-amber-400/40 flex items-center justify-center shadow-inner text-amber-200 font-serif text-xl font-bold">
              {customer.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg sm:text-xl font-bold tracking-wide">
                  {customer.full_name}
                </h3>
                {bdayStatus?.isToday && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/30 border border-amber-400/50 text-[11px] font-bold text-amber-200 animate-pulse flex items-center gap-1">
                    🎂 Birthday Today!
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-amber-200/80 mt-0.5">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" /> +91 {customer.phone}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {customer.email}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Born: {customer.date_of_birth}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => logout()}
              className="px-3 py-1.5 text-xs text-amber-200 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1.5"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
            <button
              onClick={closeAccountModal}
              className="text-stone-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Personalized Birthday Celebration Banner */}
        {birthdayOffer && birthdayOffer.has_birthday_offer && birthdayOffer.coupon && (
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white px-6 py-4 shadow-inner shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-2xl shrink-0">
                🎂
              </div>
              <div>
                <h4 className="font-serif font-bold text-base sm:text-lg flex items-center gap-2">
                  {birthdayOffer.greeting_title}
                </h4>
                <p className="text-xs text-amber-100 max-w-xl">
                  {birthdayOffer.greeting_message}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <div className="bg-white/10 border border-white/30 rounded-xl px-3 py-1.5 text-center">
                <span className="text-[10px] uppercase tracking-wider text-amber-200 block font-semibold">Coupon Code</span>
                <span className="font-mono font-bold tracking-wider text-sm sm:text-base text-amber-100">
                  {birthdayOffer.coupon.code}
                </span>
              </div>
              <button
                onClick={() => handleCopyCoupon(birthdayOffer.coupon!.code)}
                className="px-3.5 py-2 bg-white text-amber-900 hover:bg-amber-50 font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
              >
                {copiedCoupon ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-50 shrink-0 px-6">
          <button
            onClick={() => openAccountModal('orders')}
            className={`py-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 mr-6 ${
              accountModalTab === 'orders'
                ? 'text-amber-800 border-amber-600'
                : 'text-stone-500 border-transparent hover:text-stone-800'
            }`}
          >
            <Package className="w-4 h-4 text-amber-700" />
            Previous Orders
            <span className="ml-1 px-1.5 py-0.2 bg-stone-200 text-stone-700 rounded-full text-xs font-mono">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => openAccountModal('birthday')}
            className={`py-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 mr-6 ${
              accountModalTab === 'birthday'
                ? 'text-amber-800 border-amber-600'
                : 'text-stone-500 border-transparent hover:text-stone-800'
            }`}
          >
            <Gift className="w-4 h-4 text-amber-700" />
            Birthday Rewards
            {birthdayOffer?.has_birthday_offer && (
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            )}
          </button>

          <button
            onClick={() => openAccountModal('profile')}
            className={`py-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
              accountModalTab === 'profile'
                ? 'text-amber-800 border-amber-600'
                : 'text-stone-500 border-transparent hover:text-stone-800'
            }`}
          >
            <User className="w-4 h-4 text-amber-700" />
            My Profile
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-stone-50/50">
          {/* TAB 1: PREVIOUS ORDERS */}
          {accountModalTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif text-lg font-bold text-stone-800">Your Order History</h4>
                  <p className="text-xs text-stone-500">
                    Orders linked to your mobile ({customer.phone}) and email.
                  </p>
                </div>
                <button
                  onClick={fetchCustomerOrders}
                  disabled={loadingOrders}
                  className="text-xs text-amber-700 hover:text-amber-900 font-medium flex items-center gap-1"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${loadingOrders ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {loadingOrders && orders.length === 0 ? (
                <div className="py-12 text-center text-stone-400 text-sm">
                  <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  Loading your orders...
                </div>
              ) : orderError ? (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span>{orderError}</span>
                </div>
              ) : orders.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-stone-200 shadow-sm">
                  <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                  <h5 className="font-serif font-bold text-stone-700 text-base">No Orders Placed Yet</h5>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                    Taste authentic military mess curries, biryanis, and hearty meals made fresh daily.
                  </p>
                  <button
                    onClick={closeAccountModal}
                    className="mt-4 px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-xl shadow-md transition"
                  >
                    Browse Our Menu & Order
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const isNewOrPreparing = order.order_status === 'new' || order.order_status === 'preparing';
                    const isDelivered = order.order_status === 'delivered';
                    const isPaid = order.payment_status === 'paid';

                    return (
                      <div
                        key={order.id}
                        className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-5 hover:border-amber-300 transition-all"
                      >
                        {/* Order Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3 mb-3">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-sm">
                              #{order.order_number}
                            </span>
                            <span className="text-xs text-stone-500 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-stone-400" />
                              {new Date(order.created_at).toLocaleString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Order Status Badge */}
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                                isDelivered
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isNewOrPreparing
                                  ? 'bg-amber-100 text-amber-800 animate-pulse'
                                  : order.order_status === 'cancelled'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {order.order_status.replace(/_/g, ' ')}
                            </span>

                            {/* Payment Status Badge */}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-medium uppercase ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-stone-100 text-stone-600 border border-stone-200'
                              }`}
                            >
                              {order.payment_method === 'cash_on_delivery' ? 'COD' : 'Online'} • {order.payment_status}
                            </span>
                          </div>
                        </div>

                        {/* Order Items Table/List */}
                        <div className="space-y-1.5 py-1">
                          {order.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs text-stone-700 py-1 border-b border-stone-50 last:border-none"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded bg-stone-100 text-stone-600 font-mono font-semibold flex items-center justify-center text-[10px]">
                                  {item.quantity}x
                                </span>
                                <span className="font-medium text-stone-800">{item.item_name}</span>
                              </div>
                              <span className="font-mono text-stone-600">₹{item.total_price}</span>
                            </div>
                          ))}
                        </div>

                        {/* Delivery address & discount summary */}
                        <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="text-stone-500 max-w-sm flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                            <span className="truncate">{order.delivery_address}</span>
                          </div>

                          <div className="text-right">
                            {order.discount_amount && order.discount_amount > 0 && (
                              <div className="text-emerald-700 font-medium flex items-center gap-1 justify-end">
                                <Tag className="w-3 h-3" />
                                <span>Birthday Discount: -₹{order.discount_amount}</span>
                              </div>
                            )}
                            <div className="text-stone-900 font-bold text-sm">
                              Total: <span className="font-mono text-base text-amber-900">₹{order.final_total}</span>
                            </div>
                          </div>
                        </div>

                        {/* Reorder Button */}
                        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                          <span className="text-[11px] text-stone-400">
                            Single-click to re-add these dishes to your cart
                          </span>
                          {isClosedToday ? (
                            <button
                              disabled
                              className="px-4 py-2 bg-stone-100 text-stone-400 border border-stone-200 rounded-xl text-xs font-semibold cursor-not-allowed flex items-center gap-1.5"
                              title="Restaurant is closed today. Ordering is paused."
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
                              Closed Today
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReorder(order)}
                              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                              Reorder Dishes
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BIRTHDAY REWARDS */}
          {accountModalTab === 'birthday' && (
            <div className="space-y-5">
              <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/60 rounded-2xl border border-amber-200/80 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center text-2xl shadow-md">
                    🎂
                  </div>
                  <div>
                    <h4 className="font-serif text-lg font-bold text-amber-950">
                      Sri Sathya Sai Mess Birthday Club
                    </h4>
                    <p className="text-xs text-amber-800">
                      Registered Birthday: <span className="font-semibold text-stone-900">{customer.date_of_birth}</span>
                    </p>
                  </div>
                </div>

                <p className="text-xs text-stone-700 leading-relaxed">
                  Every year around your birthday, Sri Sathya Sai Mess treats you with celebratory discounts and chef specials! Our system automatically prepares your unique coupon code 3 days in advance and on your birthday.
                </p>

                {/* Status Card */}
                <div className="mt-4 bg-white/90 rounded-xl p-4 border border-amber-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-xs border-b border-amber-100 pb-2">
                    <span className="text-stone-500 font-medium">Birthday This Year:</span>
                    <span className="font-semibold text-stone-800">{bdayStatus?.birthdayThisYear || 'Upcoming'}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs border-b border-amber-100 pb-2">
                    <span className="text-stone-500 font-medium">Celebration Status:</span>
                    <span className="font-semibold">
                      {bdayStatus?.isToday ? (
                        <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                          🎉 Today is your Birthday!
                        </span>
                      ) : bdayStatus?.isWithinValidity ? (
                        <span className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                          ✨ Active Birthday Week Offer
                        </span>
                      ) : bdayStatus?.isUpcoming3Days ? (
                        <span className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                          ⏳ Approaching in 3 Days!
                        </span>
                      ) : (
                        <span className="text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
                          {bdayStatus?.daysUntilBirthday} days until next celebration
                        </span>
                      )}
                    </span>
                  </div>

                  {birthdayOffer?.coupon && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-stone-700">Active Coupon Code:</span>
                        <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                          Single Use • {birthdayOffer.coupon.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 font-mono font-bold text-amber-900 bg-amber-50 border border-amber-300 rounded-xl px-3 py-2 text-center text-sm tracking-wider">
                          {birthdayOffer.coupon.code}
                        </div>
                        <button
                          onClick={() => handleCopyCoupon(birthdayOffer.coupon!.code)}
                          className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                        >
                          {copiedCoupon ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedCoupon ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-2">
                        Valid on orders above ₹{birthdayOffer.coupon.min_order_value}. Apply this code during checkout to enjoy your celebration discount!
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Owner promise */}
              <div className="bg-white rounded-2xl border border-stone-200 p-5 text-xs text-stone-600 space-y-2">
                <h5 className="font-serif font-bold text-stone-800 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Our Birthday Tradition
                </h5>
                <p>
                  At Sri Sathya Sai Mess, we consider every patron part of our extended family. Our kitchen prepares every dish using pure cold-pressed groundnut oil, stone-ground spices, and traditional recipes without artificial colors or preservatives.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: MY PROFILE */}
          {accountModalTab === 'profile' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
                <h4 className="font-serif text-lg font-bold text-stone-800 border-b border-stone-100 pb-3">
                  Account Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-stone-400 block mb-1">Full Name</span>
                    <span className="font-semibold text-stone-800 text-sm">{customer.full_name}</span>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-stone-400 block mb-1">Mobile Number</span>
                    <span className="font-semibold text-stone-800 text-sm font-mono">+91 {customer.phone}</span>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-stone-400 block mb-1">Email Address</span>
                    <span className="font-semibold text-stone-800 text-sm">{customer.email}</span>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-stone-400 block mb-1">Date of Birth</span>
                    <span className="font-semibold text-stone-800 text-sm flex items-center gap-1.5">
                      🎂 {customer.date_of_birth}
                    </span>
                  </div>
                </div>

                <div className="pt-2 text-xs text-stone-500">
                  <p>Account ID: <span className="font-mono text-stone-600">{customer.id}</span></p>
                  <p className="mt-1">Member since: {new Date(customer.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center justify-between">
                <div>
                  <p className="font-bold">Need assistance or delivery help?</p>
                  <p className="text-stone-600">Call restaurant counter directly at 08728-222338</p>
                </div>
                <a
                  href="tel:08728222338"
                  className="px-3.5 py-1.5 bg-amber-700 text-white rounded-xl font-semibold hover:bg-amber-800 transition"
                >
                  Call Mess
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
