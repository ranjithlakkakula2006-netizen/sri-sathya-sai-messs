import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  MessageCircle,
  MapPin,
  ExternalLink,
  Clock,
  Printer,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Order } from '../types/restaurant';

interface OrderSuccessModalProps {
  order: Order | null;
  onClose: () => void;
  onTrackOrder: (orderId: string) => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  onClose,
  onTrackOrder,
}) => {
  const [whatsappInfo, setWhatsappInfo] = useState<{
    status: string;
    manual_url?: string;
    owner_phone?: string;
  } | null>(null);

  useEffect(() => {
    if (!order) return;
    // Check WhatsApp notification status or get manual fallback URL
    fetch('/api/notifications/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: order.id }),
    })
      .then((res) => res.json())
      .then((data) => setWhatsappInfo(data))
      .catch((err) => console.warn('Notification status fetch error:', err));
  }, [order]);

  if (!order) return null;

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Banner */}
        <div className="p-6 bg-stone-900 text-stone-100 text-center space-y-2 border-b border-stone-800">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle className="w-7 h-7" />
          </div>
          <span className="text-xs text-amber-400 uppercase tracking-widest font-semibold block">
            Sri Sathya Sai Mess
          </span>
          <h2 className="text-2xl font-serif font-bold text-white">Order Confirmed!</h2>
          <p className="text-xs text-stone-300">
            Thank you, {order.customer_name}. The kitchen has received your order.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs text-stone-700">
          {/* Order Details Header */}
          <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200/80">
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block">
                Order ID
              </span>
              <span className="text-base font-bold text-stone-900 font-mono">
                #{order.order_number}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">
                Status
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 capitalize">
                <Clock className="w-3.5 h-3.5" />
                <span>{order.order_status.replace(/_/g, ' ')}</span>
              </span>
            </div>
          </div>

          {/* WhatsApp Notification Box */}
          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
            <div className="flex items-start gap-2.5">
              <MessageCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-900 block text-xs">
                  Automated WhatsApp Alert
                </span>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  {whatsappInfo?.status === 'sent_via_api'
                    ? 'Dispatched directly to the restaurant owner via WhatsApp Business Cloud API.'
                    : 'A WhatsApp message was generated with order details for the owner.'}
                </p>
              </div>
            </div>

            {whatsappInfo?.manual_url && (
              <a
                href={whatsappInfo.manual_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Open in WhatsApp</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Delivery & Coordinates */}
          <div className="space-y-1.5 p-3 bg-stone-50 rounded-xl border border-stone-200/80">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-700" />
                Delivery Address
              </span>
              {order.google_maps_url && (
                <a
                  href={order.google_maps_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-800 font-bold hover:underline flex items-center gap-1"
                >
                  <span>Google Maps Pin</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <p className="text-stone-600 leading-relaxed">{order.delivery_address}</p>
            <p className="text-[11px] text-stone-500 tabular-nums">
              Phone: {order.customer_phone}
            </p>
          </div>

          {/* Items Summary */}
          <div className="space-y-2">
            <span className="font-bold text-stone-900 uppercase tracking-wider text-[11px] block">
              Ordered Items
            </span>
            <div className="divide-y divide-stone-100 border-t border-b border-stone-100 py-1">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-1.5 flex justify-between">
                  <span>
                    {item.item_name} <strong className="text-stone-900">× {item.quantity}</strong>
                  </span>
                  <span className="font-semibold text-stone-900 tabular-nums">
                    ₹{item.total_price}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-1 pt-1 text-stone-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="tabular-nums">₹{order.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charges</span>
                <span className="tabular-nums">
                  {order.delivery_fee === 0 ? 'FREE' : `₹${order.delivery_fee}`}
                </span>
              </div>
              <div className="flex justify-between font-bold text-stone-900 text-sm pt-1 border-t border-stone-200">
                <span>Total Amount</span>
                <span className="text-amber-900 tabular-nums">₹{order.final_total}</span>
              </div>
              <div className="flex justify-between text-[11px] text-stone-600 pt-1">
                <span>Payment Method</span>
                <span className="font-semibold uppercase text-stone-900">
                  {order.payment_method === 'razorpay_online'
                    ? 'Razorpay Online (UPI/Cards/NetBanking)'
                    : order.payment_method.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-stone-600">
                <span>Payment Status</span>
                <span
                  className={`font-bold uppercase ${
                    order.payment_status === 'paid' ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {order.payment_status === 'paid' ? 'PAID ✓ (Verified)' : 'PENDING (Pay upon delivery)'}
                </span>
              </div>
              {order.razorpay_payment_id && (
                <div className="flex justify-between text-[11px] text-stone-500 font-mono bg-stone-100 p-1.5 rounded">
                  <span>Razorpay Payment ID:</span>
                  <span className="font-bold text-stone-800">{order.razorpay_payment_id}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <button
              onClick={() => {
                onClose();
                onTrackOrder(order.order_number);
              }}
              className="w-full sm:flex-1 py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Track Live Status</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handlePrintReceipt}
              className="w-full sm:w-auto px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
