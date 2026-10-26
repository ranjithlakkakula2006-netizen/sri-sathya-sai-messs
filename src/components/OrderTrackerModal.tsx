import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Clock,
  CheckCircle2,
  ChefHat,
  Bike,
  PackageCheck,
  AlertCircle,
  ExternalLink,
  Star,
  Receipt,
  Phone,
  Calendar,
  RotateCcw,
  ArrowLeft,
  ChevronRight,
  ShoppingBag,
  History,
  Check,
} from 'lucide-react';
import { Order, OrderStatus } from '../types/restaurant';
import { useCart } from '../context/CartContext';

interface OrderTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderId?: string;
  onOpenReview?: (orderNumber: string, customerName: string) => void;
}

const STATUS_STEPS: { key: OrderStatus; label: string; desc: string }[] = [
  { key: 'new', label: 'Order Placed', desc: 'Received by Sri Sathya Sai Mess' },
  { key: 'confirmed', label: 'Confirmed', desc: 'Order accepted by kitchen' },
  { key: 'preparing', label: 'Preparing', desc: 'Fresh curries & rice on wood fire' },
  { key: 'out_for_delivery', label: 'Out for Delivery', desc: 'Dispatched with hot thermal pack' },
  { key: 'delivered', label: 'Delivered', desc: 'Delivered hot to your doorstep' },
];

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  isOpen,
  onClose,
  initialOrderId,
  onOpenReview,
}) => {
  const { addToCart, setIsCartOpen } = useCart();

  // Search input state
  const [searchQuery, setSearchQuery] = useState(initialOrderId || '');
  const [orderList, setOrderList] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [reorderSuccessMsg, setReorderSuccessMsg] = useState('');

  // Preset demo searches for easy testing
  const searchPresets = [
    { label: '📞 9848022338', value: '9848022338' },
    { label: '📞 9440188992', value: '9440188992' },
    { label: '🧾 #SSM-1001', value: 'SSM-1001' },
    { label: '🧾 #SSM-1002', value: 'SSM-1002' },
  ];

  // Lookup orders by phone or order ID
  const handleSearch = async (termToSearch: string) => {
    const term = termToSearch.trim();
    if (!term) return;

    setIsLoading(true);
    setError('');
    setHasSearched(true);
    setReorderSuccessMsg('');

    try {
      // Save recent search in localStorage
      localStorage.setItem('sai_mess_last_order_search', term);

      const res = await fetch(`/api/customer/orders?query=${encodeURIComponent(term)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Could not find any matching orders');
      }

      const results: Order[] = data.orders || [];
      setOrderList(results);

      if (results.length === 1) {
        // If exact single order match, show details directly
        setSelectedOrder(results[0]);
      } else {
        // Show the list of orders
        setSelectedOrder(null);
      }

      if (results.length === 0) {
        setError(`No orders found matching "${term}". Please check the phone number or order number.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search order history.');
      setOrderList([]);
      setSelectedOrder(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (!isOpen) return;

    if (initialOrderId) {
      setSearchQuery(initialOrderId);
      handleSearch(initialOrderId);
    } else {
      // Check if user has a previously remembered phone number
      const savedSearch = localStorage.getItem('sai_mess_last_order_search');
      if (savedSearch && !hasSearched) {
        setSearchQuery(savedSearch);
      }
    }
  }, [initialOrderId, isOpen]);

  if (!isOpen) return null;

  const getStepStatus = (stepKey: OrderStatus, currentStatus: OrderStatus) => {
    if (currentStatus === 'cancelled') return 'cancelled';
    const orderIndex = STATUS_STEPS.findIndex((s) => s.key === currentStatus);
    const stepIndex = STATUS_STEPS.findIndex((s) => s.key === stepKey);

    if (stepIndex < orderIndex) return 'completed';
    if (stepIndex === orderIndex) return 'current';
    return 'upcoming';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const handleReorder = (orderToReorder: Order) => {
    for (const item of orderToReorder.items) {
      for (let i = 0; i < item.quantity; i++) {
        addToCart({
          id: item.food_item_id,
          name: item.item_name,
          category_id: 'cat-reorder',
          category_name: item.category_name,
          price: item.unit_price,
          description: '',
          image_url: '/src/assets/images/dish_south_indian_meals_1792160842617.jpg',
          is_available: true,
          is_veg: !item.item_name.toLowerCase().includes('chicken') && !item.item_name.toLowerCase().includes('mutton') && !item.item_name.toLowerCase().includes('boti'),
          display_order: 1,
        });
      }
    }
    setReorderSuccessMsg(`Added ${orderToReorder.items.length} item(s) to your Bag!`);
    setTimeout(() => {
      onClose();
      setIsCartOpen(true);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-6 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 bg-stone-900 text-stone-100 flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                Customer Portal
              </span>
              <h2 className="text-base sm:text-lg font-serif font-bold text-white">
                Order History & Live Tracker
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Search Bar */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-700">
              Search Orders by Phone Number or Order ID
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch(searchQuery);
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Enter 10-digit Phone or Order ID (e.g. 9848022338 or SSM-1001)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:bg-white focus:outline-hidden focus:border-amber-600 font-medium"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !searchQuery.trim()}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap active:scale-95"
              >
                {isLoading ? 'Searching...' : 'Find Orders'}
              </button>
            </form>

            {/* Quick Demo Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-stone-400">Try looking up:</span>
              {searchPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    setSearchQuery(preset.value);
                    handleSearch(preset.value);
                  }}
                  className="text-[11px] font-medium bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 px-2 py-0.5 rounded border border-stone-200 transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {reorderSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{reorderSuccessMsg}</span>
            </div>
          )}

          {/* ================================================================= */}
          {/* VIEW A: SINGLE ORDER DETAILED TRACKER & BREAKDOWN */}
          {/* ================================================================= */}
          {selectedOrder && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Back to List button (if multiple orders existed) */}
              {orderList.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to all orders ({orderList.length} found)</span>
                </button>
              )}

              {/* Order Status Card */}
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-stone-900 font-mono">
                      #{selectedOrder.order_number}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        selectedOrder.payment_status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {selectedOrder.payment_status === 'paid' ? 'PAID ✓' : 'CASH ON DELIVERY'}
                    </span>
                  </div>
                  <span className="text-xs text-stone-600 block mt-1">
                    Customer: <strong>{selectedOrder.customer_name}</strong> &bull; {selectedOrder.customer_phone}
                  </span>
                  <span className="text-[11px] text-stone-400 block mt-0.5">
                    Placed: {formatDate(selectedOrder.created_at)}
                  </span>
                </div>
                <div className="sm:text-right">
                  <span className="text-base font-bold text-stone-900 block tabular-nums">
                    ₹{selectedOrder.final_total}
                  </span>
                  <span className="text-[11px] font-bold text-amber-700 capitalize inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{selectedOrder.order_status.replace(/_/g, ' ')}</span>
                  </span>
                </div>
              </div>

              {/* Progress Stepper Timeline */}
              {selectedOrder.order_status === 'cancelled' ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center space-y-1">
                  <span className="text-sm font-bold text-red-800 block">Order Cancelled</span>
                  <p className="text-xs text-red-600">
                    This order was cancelled. If payment was made online, your refund will reflect within 24 hours.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-stone-900 text-stone-100 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Live Delivery Progress
                    </span>
                    <span className="text-[11px] text-stone-400">
                      Estimated 30–45 mins
                    </span>
                  </div>

                  <div className="space-y-4 relative pl-4 border-l-2 border-stone-700 ml-3 py-1">
                    {STATUS_STEPS.map((step) => {
                      const stepState = getStepStatus(step.key, selectedOrder.order_status);
                      return (
                        <div key={step.key} className="relative">
                          {/* Dot indicator */}
                          <div
                            className={`absolute -left-[23px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                              stepState === 'completed'
                                ? 'border-emerald-500 bg-emerald-500 text-stone-950 font-bold'
                                : stepState === 'current'
                                ? 'border-amber-400 bg-amber-400 text-stone-950 ring-4 ring-amber-400/20'
                                : 'border-stone-600 bg-stone-800 text-transparent'
                            }`}
                          >
                            {stepState === 'completed' && <CheckCircle2 className="w-3 h-3 text-stone-950" />}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-bold ${
                                  stepState === 'current'
                                    ? 'text-amber-400'
                                    : stepState === 'completed'
                                    ? 'text-white'
                                    : 'text-stone-500'
                                }`}
                              >
                                {step.label}
                              </span>
                              {stepState === 'current' && (
                                <span className="text-[10px] font-bold text-stone-950 bg-amber-400 px-1.5 py-0.2 rounded">
                                  Current Status
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-400">{step.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Delivery Address & Location */}
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1 text-xs">
                <span className="font-bold text-stone-900 block text-[11px] uppercase tracking-wide">
                  Delivery Destination
                </span>
                <p className="text-stone-700">{selectedOrder.delivery_address}</p>
                {selectedOrder.google_maps_url && (
                  <a
                    href={selectedOrder.google_maps_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-amber-800 font-semibold text-[11px] hover:underline pt-1"
                  >
                    <span>View Map Coordinates</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Items Breakdown */}
              <div className="space-y-2 text-xs">
                <span className="font-bold text-stone-900 uppercase tracking-wider text-[11px] block">
                  Items Ordered
                </span>
                <div className="divide-y divide-stone-100 border-t border-b border-stone-100 py-1">
                  {selectedOrder.items.map((i, idx) => (
                    <div key={idx} className="py-1.5 flex justify-between items-center text-stone-800">
                      <div>
                        <span className="font-medium">{i.item_name}</span>
                        <span className="text-stone-500 text-[11px] ml-1.5">× {i.quantity}</span>
                      </div>
                      <span className="font-semibold tabular-nums">₹{i.total_price}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 pt-1 text-stone-600 text-xs">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="tabular-nums">₹{selectedOrder.subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Charges</span>
                    <span className="tabular-nums">
                      {selectedOrder.delivery_fee === 0 ? 'FREE' : `₹${selectedOrder.delivery_fee}`}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-stone-900 text-sm pt-1 border-t border-stone-200">
                    <span>Grand Total</span>
                    <span className="text-amber-900 tabular-nums">₹{selectedOrder.final_total}</span>
                  </div>
                </div>
              </div>

              {/* Actions: Reorder & Rate Review */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleReorder(selectedOrder)}
                  className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reorder This Meal</span>
                </button>

                {onOpenReview && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenReview(selectedOrder.order_number, selectedOrder.customer_name);
                    }}
                    className="py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>Rate & Review Food</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* VIEW B: LIST OF MULTIPLE PAST ORDERS (ORDER HISTORY) */}
          {/* ================================================================= */}
          {!selectedOrder && orderList.length > 0 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-1 border-b border-stone-200">
                <span className="text-xs font-bold text-stone-800">
                  Past Orders Found ({orderList.length})
                </span>
                <span className="text-[11px] text-stone-500">
                  Showing newest first
                </span>
              </div>

              <div className="space-y-3">
                {orderList.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 rounded-xl border border-stone-200 hover:border-amber-400/80 bg-stone-50/50 hover:bg-amber-50/20 transition-all space-y-3"
                  >
                    {/* Top Row: Order ID, Status, Amount */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-stone-900 text-sm">
                            #{ord.order_number}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              ord.order_status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : ord.order_status === 'cancelled'
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {ord.order_status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-stone-400" />
                          <span>{formatDate(ord.created_at)}</span>
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-sm text-stone-900 tabular-nums block">
                          ₹{ord.final_total}
                        </span>
                        <span className="text-[10px] font-semibold text-stone-500 uppercase block">
                          {ord.payment_method === 'razorpay_online' ? 'Online Paid' : 'Cash on Delivery'}
                        </span>
                      </div>
                    </div>

                    {/* Items summary */}
                    <div className="text-xs text-stone-700 bg-white p-2.5 rounded-lg border border-stone-150 space-y-1">
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px]">
                          <span>
                            {it.item_name} <strong className="text-stone-900">× {it.quantity}</strong>
                          </span>
                          <span className="tabular-nums text-stone-500">₹{it.total_price}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-1 gap-2">
                      <button
                        type="button"
                        onClick={() => handleReorder(ord)}
                        className="text-xs font-semibold text-stone-700 hover:text-stone-950 flex items-center gap-1 py-1 px-2.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                        <span>Reorder</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedOrder(ord)}
                        className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 py-1 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 transition-colors cursor-pointer"
                      >
                        <span>Track Live Status & Receipt</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* VIEW C: INITIAL EMPTY STATE */}
          {/* ================================================================= */}
          {!selectedOrder && orderList.length === 0 && !isLoading && !error && (
            <div className="py-8 text-center space-y-3 bg-stone-50 rounded-2xl border border-stone-150 p-6">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto border border-amber-500/20">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-stone-900">
                Look up your past orders
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                Enter the phone number you used during checkout to view all your previous meals, track live dispatch progress, or reorder with one click.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
