import React from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useRestaurantStatus } from '../context/RestaurantStatusContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onProceedToCheckout,
}) => {
  const { cart, addToCart, decrementQuantity, removeFromCart, subtotal, deliveryFee, finalTotal } =
    useCart();
  const { isClosedToday } = useRestaurantStatus();

  if (!isOpen) return null;

  const freeDeliveryThreshold = 500;
  const amountNeededForFreeDelivery = freeDeliveryThreshold - subtotal;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-900 text-stone-100">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-base font-bold font-serif">Your Food Bag</h2>
                <span className="text-xs text-stone-400">
                  {cart.length} {cart.length === 1 ? 'item' : 'items'} selected
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Prominent Restaurant Closed Announcement in Cart Drawer */}
            {isClosedToday && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-1 text-amber-950">
                <div className="flex items-center gap-2 font-bold text-stone-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Restaurant Will Be Closed Today</span>
                </div>
                <p className="text-stone-700 leading-relaxed text-[11px]">
                  Sorry for the inconvenience. We are not accepting orders today. Please visit us again soon!
                </p>
              </div>
            )}

            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                  <ShoppingBag className="w-8 h-8 opacity-60" />
                </div>
                <h3 className="text-base font-bold text-stone-800">Your bag is empty</h3>
                <p className="text-xs text-stone-500 max-w-xs">
                  Explore our authentic military curries, dum biryanis, and full meals to start your order.
                </p>
                <button
                  onClick={onClose}
                  className="mt-2 px-5 py-2.5 bg-amber-500 text-stone-950 font-bold text-xs rounded-lg hover:bg-amber-400 transition-colors cursor-pointer"
                >
                  Explore Menu
                </button>
              </div>
            ) : (
              <>
                {/* Free Delivery Progress */}
                {amountNeededForFreeDelivery > 0 ? (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200/60 text-xs text-amber-900 flex items-center justify-between">
                    <span>
                      Add <strong className="tabular-nums">₹{amountNeededForFreeDelivery}</strong> more for free delivery!
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-200/60 px-1.5 py-0.5 rounded">
                      ₹500 Threshold
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Unlocked Free Delivery for this order!</span>
                  </div>
                )}

                {/* Items List */}
                <div className="divide-y divide-stone-100">
                  {cart.map(({ food_item, quantity }) => (
                    <div key={food_item.id} className="py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                          <img
                            src={food_item.image_url}
                            alt={food_item.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-stone-900 truncate">
                            {food_item.name}
                          </h4>
                          <span className="text-xs text-stone-500 tabular-nums">
                            ₹{food_item.price} each
                          </span>
                        </div>
                      </div>

                      {/* Stepper & Total */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center border border-stone-300 rounded-lg bg-stone-50 text-stone-800">
                          <button
                            onClick={() => decrementQuantity(food_item.id)}
                            className="p-1 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold px-2 tabular-nums">
                            {quantity}
                          </span>
                          <button
                            onClick={() => addToCart(food_item)}
                            className="p-1 hover:text-emerald-600 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="text-sm font-bold text-stone-900 tabular-nums min-w-[3rem] text-right">
                          ₹{food_item.price * quantity}
                        </span>

                        <button
                          onClick={() => removeFromCart(food_item.id)}
                          className="p-1 text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer Billing Details */}
          {cart.length > 0 && (
            <div className="p-5 bg-stone-50 border-t border-stone-200 space-y-3">
              <div className="space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-stone-800 tabular-nums">
                    ₹{subtotal}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-semibold tabular-nums text-stone-800">
                    {deliveryFee === 0 ? (
                      <span className="text-emerald-700 font-bold">FREE</span>
                    ) : (
                      `₹${deliveryFee}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-stone-200 text-sm font-bold text-stone-950">
                  <span>Total Amount</span>
                  <span className="text-base text-amber-900 tabular-nums">
                    ₹{finalTotal}
                  </span>
                </div>
              </div>

              {isClosedToday ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3.5 bg-stone-200 border border-stone-300 text-stone-500 font-bold rounded-lg cursor-not-allowed opacity-90 flex items-center justify-center gap-2"
                >
                  <span>Restaurant Closed Today &bull; Ordering Paused</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    onClose();
                    onProceedToCheckout();
                  }}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-stone-950 font-bold rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
