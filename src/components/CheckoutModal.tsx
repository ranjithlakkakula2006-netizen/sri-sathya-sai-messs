import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  CreditCard,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Navigation,
  ExternalLink,
  ShieldCheck,
  Lock,
  Smartphone,
  Building2,
  Check,
  ArrowRight,
  Gift,
  Tag,
  Sparkles,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useRestaurantStatus } from '../context/RestaurantStatusContext';
import { CustomerLocation, Order, PaymentMethod } from '../types/restaurant';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
}

interface RazorpaySandboxData {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  calculated_total: number;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess,
}) => {
  const { cart, subtotal, deliveryFee, finalTotal, clearCart } = useCart();
  const { customer, birthdayOffer } = useCustomerAuth();
  const { isClosedToday } = useRestaurantStatus();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay_online');

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    offer_type: string;
    discount_amount: number;
    free_item_name?: string;
    description: string;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    if (customer && isOpen) {
      setCustomerName((prev) => prev || customer.full_name);
      setCustomerPhone((prev) => prev || customer.phone);
      setCustomerEmail((prev) => prev || customer.email);
    }
  }, [customer, isOpen]);

  const handleApplyCoupon = async (codeToUse?: string) => {
    if (isClosedToday) {
      setCouponError('Restaurant is closed today. Coupons cannot be redeemed today.');
      return;
    }
    const code = (codeToUse || couponCode).trim();
    if (!code) return;
    setCouponError(null);
    setValidatingCoupon(true);
    try {
      const res = await fetch('/api/customer/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedCoupon(data);
        setCouponCode(data.code);
      } else {
        setCouponError(data.error || 'Invalid coupon code');
        setAppliedCoupon(null);
      }
    } catch (err: any) {
      setCouponError(err.message || 'Error validating coupon');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  const discountAmount = appliedCoupon ? appliedCoupon.discount_amount : 0;
  const payableTotal = Math.max(0, subtotal - discountAmount) + deliveryFee;

  // Location state
  const [locationStatus, setLocationStatus] = useState<
    'idle' | 'requesting' | 'granted' | 'denied'
  >('idle');
  const [coords, setCoords] = useState<CustomerLocation | null>(null);
  const [locationErrorMsg, setLocationErrorMsg] = useState('');

  // Processing state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Embedded Razorpay Standard Checkout Sandbox modal state
  const [razorpaySandboxModal, setRazorpaySandboxModal] = useState<{
    isOpen: boolean;
    data: RazorpaySandboxData | null;
    orderPayload: any;
  }>({
    isOpen: false,
    data: null,
    orderPayload: null,
  });

  // Razorpay Sandbox checkout tab
  const [sandboxTab, setSandboxTab] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [sandboxUpiApp, setSandboxUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'vpa'>('gpay');
  const [sandboxVpa, setSandboxVpa] = useState('customer@okhdfcbank');
  const [sandboxCard, setSandboxCard] = useState({
    number: '4111 •••• •••• 1111',
    expiry: '12/28',
    cvv: '123',
    name: '',
  });
  const [sandboxBank, setSandboxBank] = useState('HDFC Bank');
  const [isSandboxProcessing, setIsSandboxProcessing] = useState(false);

  if (!isOpen) return null;

  // Handle Geolocation Request
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      setLocationErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setLocationStatus('requesting');
    setLocationErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const gMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setCoords({
          latitude,
          longitude,
          accuracy,
          google_maps_url: gMapsUrl,
        });
        setLocationStatus('granted');
      },
      (error) => {
        setLocationStatus('denied');
        let msg = 'Location permission was not granted.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please enter your complete delivery address manually below.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is currently unavailable. Please enter your address manually.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please enter your address manually.';
        }
        setLocationErrorMsg(msg);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double-clicks / concurrent submissions
    setErrorMessage('');

    if (isClosedToday) {
      setErrorMessage('Restaurant is closed today. We are not accepting orders today. Please visit us again soon!');
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (!customerPhone.trim() || cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!deliveryAddress.trim()) {
      setErrorMessage('Please enter your complete delivery address');
      return;
    }
    if (cart.length === 0) {
      setErrorMessage('Your cart is empty. Please add items to checkout.');
      return;
    }

    setIsSubmitting(true);
    const clientGeneratedIdempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // 1. Prepare Order Payload (Shared across COD & Razorpay verification)
    const orderPayload = {
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      customer_email: customerEmail.trim() || undefined,
      delivery_address: deliveryAddress.trim(),
      customer_latitude: coords ? coords.latitude : null,
      customer_longitude: coords ? coords.longitude : null,
      items: cart.map((i) => ({
        food_item_id: i.food_item.id,
        item_name: i.food_item.name,
        category_name: i.food_item.category_name,
        quantity: i.quantity,
        unit_price: i.food_item.price,
      })),
      notes: notes.trim() || undefined,
      customer_id: customer?.id || undefined,
      coupon_code: appliedCoupon?.code || undefined,
      idempotency_key: clientGeneratedIdempotencyKey,
    };

    try {
      // -------------------------------------------------------------
      // 2. CASH ON DELIVERY (COD) FLOW
      // -------------------------------------------------------------
      if (paymentMethod === 'cash_on_delivery') {
        const codRes = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': clientGeneratedIdempotencyKey,
          },
          body: JSON.stringify({
            ...orderPayload,
            payment_method: 'cash_on_delivery',
            payment_status: 'pending',
          }),
        });

        const codData = await codRes.json();
        if (!codRes.ok) {
          throw new Error(codData.error || 'Failed to place Cash on Delivery order.');
        }

        clearCart();
        setIsSubmitting(false);
        onClose();
        onOrderSuccess(codData);
        return;
      }

      // -------------------------------------------------------------
      // 3. PAY ONLINE WITH RAZORPAY FLOW
      // -------------------------------------------------------------
      // Step A: Create server-side Razorpay order
      const rzpRes = await fetch('/api/payments/create-razorpay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderPayload.items,
          receipt: `rcpt_${Date.now()}`,
          coupon_code: appliedCoupon?.code || undefined,
        }),
      });

      const rzpData = await rzpRes.json();
      if (!rzpRes.ok) {
        throw new Error(rzpData.error || 'Failed to initiate secure Razorpay payment.');
      }

      // Step B: Check for official Razorpay Standard Checkout SDK
      const RazorpayClass = (window as any).Razorpay;

      if (!rzpData.is_test_mode && typeof RazorpayClass === 'function') {
        // Live / Configured Razorpay Standard Checkout Popup
        const options = {
          key: rzpData.key_id,
          amount: rzpData.amount,
          currency: rzpData.currency || 'INR',
          name: 'Sri Sathya Sai Mess',
          description: 'Fresh Meals, Biryani & Curries Order',
          order_id: rzpData.order_id,
          prefill: {
            name: customerName,
            contact: customerPhone,
            email: customerEmail || 'customer@srisathyasaimess.com',
          },
          theme: {
            color: '#b45309', // Amber 700 theme
          },
          handler: async (response: any) => {
            try {
              setIsVerifyingPayment(true);
              // Server-side HMAC-SHA256 signature verification
              const verifyRes = await fetch('/api/payments/verify-razorpay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  order_payload: orderPayload,
                }),
              });

              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.success) {
                clearCart();
                setIsSubmitting(false);
                setIsVerifyingPayment(false);
                onClose();
                onOrderSuccess(verifyData.order);
              } else {
                throw new Error(verifyData.error || 'Payment verification failed on server.');
              }
            } catch (err: any) {
              setIsVerifyingPayment(false);
              setIsSubmitting(false);
              setErrorMessage(err.message || 'Payment signature verification failed.');
            }
          },
          modal: {
            ondismiss: () => {
              setIsSubmitting(false);
              setErrorMessage('Razorpay checkout window was closed. Your order is not placed yet.');
            },
          },
        };

        const rzpInstance = new RazorpayClass(options);
        rzpInstance.on('payment.failed', (failedRes: any) => {
          setIsSubmitting(false);
          setErrorMessage(
            `Payment Failed: ${failedRes.error?.description || 'Transaction declined by bank or UPI'}`
          );
        });
        rzpInstance.open();
      } else {
        // Seamless Developer Sandbox Mode: Open authentic Razorpay Standard Checkout modal
        setRazorpaySandboxModal({
          isOpen: true,
          data: rzpData,
          orderPayload,
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during checkout. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Handler for authorizing payment in Razorpay Checkout modal
  const handleAuthorizeSandboxPayment = async () => {
    if (!razorpaySandboxModal.data) return;
    setIsSandboxProcessing(true);
    setErrorMessage('');

    try {
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const orderId = razorpaySandboxModal.data.order_id;

      // 1. Request real HMAC-SHA256 signature from the server
      const sigRes = await fetch('/api/payments/create-test-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
        }),
      });

      const sigData = await sigRes.json();
      if (!sigRes.ok || !sigData.signature) {
        throw new Error('Failed to generate cryptographic test signature.');
      }

      // 2. Submit to server-side Razorpay verification endpoint
      const verifyRes = await fetch('/api/payments/verify-razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: sigData.signature,
          order_payload: razorpaySandboxModal.orderPayload,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Server signature verification failed.');
      }

      // Success: Clear cart, close modals, notify parent
      clearCart();
      setIsSandboxProcessing(false);
      setRazorpaySandboxModal({ isOpen: false, data: null, orderPayload: null });
      setIsSubmitting(false);
      onClose();
      onOrderSuccess(verifyData.order);
    } catch (err: any) {
      setIsSandboxProcessing(false);
      setErrorMessage(err.message || 'Payment processing failed. Please try again.');
    }
  };

  const handleSimulateFailure = () => {
    setIsSandboxProcessing(false);
    setRazorpaySandboxModal({ isOpen: false, data: null, orderPayload: null });
    setIsSubmitting(false);
    setErrorMessage('Razorpay Payment was declined by user / bank (BAD_REQUEST_PAYMENT_DECLINED). Your cart items are preserved.');
  };

  const handleCancelSandbox = () => {
    setIsSandboxProcessing(false);
    setRazorpaySandboxModal({ isOpen: false, data: null, orderPayload: null });
    setIsSubmitting(false);
    setErrorMessage('Payment was cancelled. You can retry or choose Cash on Delivery.');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-6">
          {/* Header */}
          <div className="px-6 py-4 bg-stone-900 text-stone-100 flex items-center justify-between border-b border-stone-800">
            <div>
              <span className="text-xs text-amber-400 font-semibold tracking-wider uppercase">
                Sri Sathya Sai Mess
              </span>
              <h2 className="text-lg font-serif font-bold text-stone-50">Delivery & Checkout</h2>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting || isVerifyingPayment}
              className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handlePlaceOrder} className="p-6 space-y-6">
            {/* Prominent Restaurant Closed Announcement on Checkout Page */}
            {isClosedToday && (
              <div className="bg-amber-50 border-2 border-amber-500 rounded-xl p-4 shadow-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold font-serif text-stone-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-ping inline-block" />
                    Restaurant Will Be Closed Today
                  </h3>
                  <p className="text-xs text-stone-700 leading-relaxed font-medium">
                    Sorry for the inconvenience. We are not accepting orders today. Please visit us again soon!
                  </p>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Customer Details */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                1. Customer Contact Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Reddy"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:bg-white focus:outline-hidden focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:bg-white focus:outline-hidden focus:border-amber-600 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Email Address (Optional, for digital receipt)
                </label>
                <input
                  type="email"
                  placeholder="e.g. ramesh@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:bg-white focus:outline-hidden focus:border-amber-600"
                />
              </div>
            </div>

            {/* Location & Address */}
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                  2. Delivery Location & Address
                </h3>
                <button
                  type="button"
                  onClick={handleRequestLocation}
                  disabled={locationStatus === 'requesting'}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  {locationStatus === 'requesting' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Navigation className="w-3.5 h-3.5 text-amber-700" />
                  )}
                  <span>Use Current GPS Location</span>
                </button>
              </div>

              {locationStatus === 'granted' && coords && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Exact Coordinates Captured
                    </span>
                    <a
                      href={coords.google_maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-emerald-900 font-bold underline flex items-center gap-1"
                    >
                      <span>View Pin</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-[11px] text-emerald-700 tabular-nums">
                    Latitude: {coords.latitude.toFixed(6)}, Longitude: {coords.longitude.toFixed(6)}
                  </p>
                </div>
              )}

              {locationStatus === 'denied' && (
                <div className="p-3 bg-stone-100 border border-stone-300 rounded-lg text-xs text-stone-700 space-y-1">
                  <div className="flex items-center gap-1.5 text-stone-800 font-semibold">
                    <AlertCircle className="w-4 h-4 text-stone-500" />
                    <span>Location Permission Unavailable</span>
                  </div>
                  <p className="text-[11px] text-stone-600">
                    {locationErrorMsg ||
                      'GPS access was not granted. Please ensure your complete door number, street, and landmark are typed below.'}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Complete Delivery Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Door/Flat No., Street, Landmark, Area name..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:bg-white focus:outline-hidden focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Cooking / Delivery Instructions (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Extra spicy, pack extra onions, don't ring bell..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg text-stone-900 focus:bg-white focus:outline-hidden focus:border-amber-600"
                />
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                  3. Select Payment Option
                </h3>
                <span className="text-[11px] text-stone-500 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  256-bit Encrypted
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {/* 1. Pay Online with Razorpay */}
                <label
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all ${
                    paymentMethod === 'razorpay_online'
                      ? 'border-amber-600 bg-amber-50/70 ring-1 ring-amber-600 shadow-xs'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      value="razorpay_online"
                      checked={paymentMethod === 'razorpay_online'}
                      onChange={() => setPaymentMethod('razorpay_online')}
                      className="mt-1 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 text-sm">
                          Pay Online with Razorpay
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                          Instant Confirmation
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-0.5">
                        UPI (GPay, PhonePe, Paytm, BHIM) · Credit / Debit Cards · Net Banking · Wallets
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                    <span className="px-2 py-1 rounded bg-white border border-stone-200 text-[10px] font-bold text-stone-700">
                      UPI
                    </span>
                    <span className="px-2 py-1 rounded bg-white border border-stone-200 text-[10px] font-bold text-stone-700">
                      Cards
                    </span>
                    <span className="px-2 py-1 rounded bg-white border border-stone-200 text-[10px] font-bold text-stone-700">
                      NetBanking
                    </span>
                  </div>
                </label>

                {/* 2. Cash on Delivery (COD) */}
                <label
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all ${
                    paymentMethod === 'cash_on_delivery'
                      ? 'border-amber-600 bg-amber-50/70 ring-1 ring-amber-600 shadow-xs'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      value="cash_on_delivery"
                      checked={paymentMethod === 'cash_on_delivery'}
                      onChange={() => setPaymentMethod('cash_on_delivery')}
                      className="mt-1 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 text-sm">
                          Cash on Delivery (COD)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700">
                          Pay at Doorstep
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-0.5">
                        Pay with cash or scan delivery partner's QR code upon arrival. Razorpay checkout will not open.
                      </p>
                    </div>
                  </div>

                  <Banknote className="w-5 h-5 text-amber-700 self-end sm:self-auto shrink-0" />
                </label>
              </div>
            </div>

            {/* Birthday Coupon / Promo Code Input Section */}
            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Tag className="w-3.5 h-3.5 text-amber-700" />
                  Have a Coupon / Birthday Code?
                </span>
                {appliedCoupon && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Applied ✓
                  </span>
                )}
              </div>

              {isClosedToday ? (
                <div className="p-3 bg-stone-100 border border-stone-200 rounded-lg text-xs text-stone-600 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Coupons and birthday discount redemption are paused while the restaurant is closed today.</span>
                </div>
              ) : (
                <>
                  {/* If logged-in customer has an active birthday coupon and not yet applied */}
                  {birthdayOffer?.coupon && (!appliedCoupon || appliedCoupon.code !== birthdayOffer.coupon.code) && (
                    <div className="bg-white border border-amber-300 rounded-lg p-2.5 flex items-center justify-between gap-2 shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🎂</span>
                        <div className="text-[11px] text-stone-800">
                          <span className="font-bold text-amber-900">Your Birthday Gift:</span>{' '}
                          <span className="font-mono font-semibold">{birthdayOffer.coupon.code}</span>
                          <span className="text-stone-500 block text-[10px]">
                            {birthdayOffer.coupon.offer_type === 'percentage'
                              ? `${birthdayOffer.coupon.discount_value}% OFF on min ₹${birthdayOffer.coupon.min_order_value}`
                              : `₹${birthdayOffer.coupon.discount_value} OFF on min ₹${birthdayOffer.coupon.min_order_value}`}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyCoupon(birthdayOffer.coupon!.code)}
                        disabled={validatingCoupon}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-md transition shadow-xs whitespace-nowrap"
                      >
                        {validatingCoupon ? 'Applying...' : 'Apply Coupon'}
                      </button>
                    </div>
                  )}

                  {!appliedCoupon ? (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Enter code (e.g. BDAY-RAJESH-2026)"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 font-mono uppercase focus:outline-hidden focus:border-amber-600"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyCoupon()}
                        disabled={!couponCode.trim() || validatingCoupon}
                        className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                      >
                        {validatingCoupon ? 'Validating...' : 'Apply'}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-emerald-900 font-mono tracking-wider">{appliedCoupon.code}</span>
                        <p className="text-[11px] text-emerald-700 font-medium">{appliedCoupon.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-xs text-red-600 hover:text-red-800 underline font-semibold"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </>
              )}

              {couponError && (
                <p className="text-[11px] text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {couponError}
                </p>
              )}
            </div>

            {/* Billing Summary Box */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/90 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Items Total ({cart.length} dishes)</span>
                <span className="font-semibold text-stone-900 tabular-nums">₹{subtotal}</span>
              </div>
              {appliedCoupon && discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span className="flex items-center gap-1">
                    <Gift className="w-3 h-3" />
                    Birthday Discount ({appliedCoupon.code})
                  </span>
                  <span className="tabular-nums">-₹{discountAmount}</span>
                </div>
              )}
              {appliedCoupon?.free_item_name && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Complimentary Dish
                  </span>
                  <span>{appliedCoupon.free_item_name} (FREE)</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>Delivery Charges</span>
                <span className="font-semibold tabular-nums text-stone-900">
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-700 font-bold">FREE (Above ₹500)</span>
                  ) : (
                    `₹${deliveryFee}`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-stone-950 pt-2 border-t border-stone-200">
                <span>Total Amount</span>
                <span className="text-base text-amber-900 tabular-nums">₹{payableTotal}</span>
              </div>
            </div>

            {/* Submit CTA */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isVerifyingPayment}
                className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              >
                {isClosedToday ? 'Close' : 'Cancel'}
              </button>

              {isClosedToday ? (
                <button
                  type="button"
                  disabled
                  className="px-6 py-3 bg-stone-300 text-stone-600 font-bold text-xs sm:text-sm rounded-lg cursor-not-allowed opacity-90 shadow-none flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-stone-600" />
                  <span>Restaurant Closed Today &bull; Orders Blocked</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || isVerifyingPayment}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-bold text-xs sm:text-sm rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition-all disabled:opacity-60"
                >
                  {isSubmitting || isVerifyingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isVerifyingPayment ? 'Verifying Signature...' : 'Connecting to Razorpay...'}</span>
                    </>
                  ) : paymentMethod === 'razorpay_online' ? (
                    <>
                      <CreditCard className="w-4 h-4 text-stone-900" />
                      <span>Pay Now via Razorpay (₹{payableTotal})</span>
                    </>
                  ) : (
                    <>
                      <Banknote className="w-4 h-4 text-stone-900" />
                      <span>Place Cash on Delivery Order (₹{payableTotal})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* AUTHENTIC RAZORPAY STANDARD CHECKOUT SANDBOX MODAL */}
      {/* ------------------------------------------------------------- */}
      {razorpaySandboxModal.isOpen && razorpaySandboxModal.data && (
        <div className="fixed inset-0 z-60 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Razorpay Brand Top Bar */}
            <div className="bg-[#0c2340] text-white p-4 flex items-center justify-between border-b border-blue-950">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 font-black text-sm">
                  ₹
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide flex items-center gap-1.5">
                    <span>Razorpay Standard Checkout</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      TEST SANDBOX
                    </span>
                  </h3>
                  <p className="text-[11px] text-stone-300">Sri Sathya Sai Mess</p>
                </div>
              </div>
              <button
                onClick={handleCancelSandbox}
                disabled={isSandboxProcessing}
                className="p-1 rounded-md text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Price Strip */}
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-500 block">
                  Amount Payable
                </span>
                <span className="text-xl font-bold text-stone-950 tabular-nums font-mono">
                  ₹{razorpaySandboxModal.data.calculated_total}.00
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-stone-500 block">Order ID</span>
                <span className="text-xs font-mono font-bold text-blue-700">
                  {razorpaySandboxModal.data.order_id}
                </span>
              </div>
            </div>

            {/* Razorpay Payment Method Tabs */}
            <div className="flex border-b border-stone-200 bg-stone-100 text-xs font-semibold">
              <button
                onClick={() => setSandboxTab('upi')}
                className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                  sandboxTab === 'upi'
                    ? 'border-blue-600 bg-white text-blue-700 font-bold'
                    : 'border-transparent text-stone-600 hover:text-stone-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>UPI / QR</span>
              </button>
              <button
                onClick={() => setSandboxTab('card')}
                className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                  sandboxTab === 'card'
                    ? 'border-blue-600 bg-white text-blue-700 font-bold'
                    : 'border-transparent text-stone-600 hover:text-stone-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
              <button
                onClick={() => setSandboxTab('netbanking')}
                className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                  sandboxTab === 'netbanking'
                    ? 'border-blue-600 bg-white text-blue-700 font-bold'
                    : 'border-transparent text-stone-600 hover:text-stone-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>NetBanking</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-5 space-y-4 text-xs">
              {sandboxTab === 'upi' && (
                <div className="space-y-3">
                  <span className="text-stone-600 block text-[11px] font-semibold">
                    Select Test UPI App or Virtual Payment Address (VPA):
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'gpay', name: 'Google Pay' },
                      { id: 'phonepe', name: 'PhonePe' },
                      { id: 'paytm', name: 'Paytm UPI' },
                    ].map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => setSandboxUpiApp(app.id as any)}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                          sandboxUpiApp === app.id
                            ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs ring-1 ring-blue-600'
                            : 'border-stone-200 hover:bg-stone-50 text-stone-800'
                        }`}
                      >
                        {app.name}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">
                      UPI ID / VPA
                    </label>
                    <input
                      type="text"
                      value={sandboxVpa}
                      onChange={(e) => setSandboxVpa(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {sandboxTab === 'card' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      value={sandboxCard.number}
                      onChange={(e) => setSandboxCard({ ...sandboxCard, number: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 text-xs font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-stone-600 mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        value={sandboxCard.expiry}
                        onChange={(e) => setSandboxCard({ ...sandboxCard, expiry: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-stone-600 mb-1">CVV</label>
                      <input
                        type="password"
                        value={sandboxCard.cvv}
                        onChange={(e) => setSandboxCard({ ...sandboxCard, cvv: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-stone-900 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {sandboxTab === 'netbanking' && (
                <div className="space-y-3">
                  <span className="text-stone-600 block text-[11px] font-semibold">
                    Popular Indian Banks:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Bank'].map(
                      (b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setSandboxBank(b)}
                          className={`p-2 rounded-lg border text-xs font-semibold text-left transition-all cursor-pointer ${
                            sandboxBank === b
                              ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold ring-1 ring-blue-600'
                              : 'border-stone-200 hover:bg-stone-50 text-stone-800'
                          }`}
                        >
                          {b}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Security info */}
              <div className="p-2.5 bg-blue-50/70 rounded-lg border border-blue-100 flex items-center justify-between text-[11px] text-blue-900">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  HMAC-SHA256 Server Signature Verification
                </span>
                <span className="font-bold">256-bit</span>
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleAuthorizeSandboxPayment}
                  disabled={isSandboxProcessing}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60"
                >
                  {isSandboxProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Cryptographic Signature...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Authorize & Pay ₹{razorpaySandboxModal.data.calculated_total}.00</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSimulateFailure}
                    disabled={isSandboxProcessing}
                    className="text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                  >
                    Simulate Payment Failure
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelSandbox}
                    disabled={isSandboxProcessing}
                    className="text-stone-500 hover:text-stone-700 hover:underline cursor-pointer"
                  >
                    Cancel Transaction
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
