import React, { useState } from 'react';
import { Plus, Minus, Check, Utensils } from 'lucide-react';
import { FoodItem } from '../types/restaurant';
import { useCart } from '../context/CartContext';
import { useRestaurantStatus } from '../context/RestaurantStatusContext';

interface FoodCardProps {
  item: FoodItem;
}

export const FoodCard: React.FC<FoodCardProps> = ({ item }) => {
  const { cart, addToCart, decrementQuantity } = useCart();
  const { isClosedToday } = useRestaurantStatus();
  const [imageError, setImageError] = useState(false);

  const cartItem = cart.find((i) => i.food_item.id === item.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  return (
    <article className="group relative bg-white rounded-xl border border-stone-200/90 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Image Slot */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
          {!imageError && item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 text-stone-400 p-4 text-center">
              <Utensils className="w-8 h-8 mb-1.5 opacity-60 text-amber-700" />
              <span className="text-xs font-medium text-stone-500 line-clamp-1">{item.name}</span>
            </div>
          )}

          {/* FSSAI Veg / Non-Veg Indicator */}
          <div className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-xs p-1 rounded-sm shadow-xs">
            <span
              className={`w-3.5 h-3.5 flex items-center justify-center border ${
                item.is_veg ? 'border-emerald-600' : 'border-red-600'
              }`}
              title={item.is_veg ? 'Vegetarian' : 'Non-Vegetarian'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  item.is_veg ? 'bg-emerald-600' : 'bg-red-600'
                }`}
              />
            </span>
          </div>

          {/* Availability Status */}
          {!item.is_available && (
            <div className="absolute inset-0 bg-stone-900/65 backdrop-blur-[1px] flex items-center justify-center">
              <span className="px-3 py-1 bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-md shadow-sm">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium">
            <span>{item.category_name}</span>
            {item.is_veg && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-700 font-semibold">Pure Veg</span>
              </>
            )}
          </div>

          <h3 className="text-base font-bold text-stone-900 line-clamp-1 group-hover:text-amber-800 transition-colors">
            {item.name}
          </h3>

          <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>

      {/* Footer & Action Module */}
      <div className="p-4 pt-0 mt-2 flex items-center justify-between border-t border-stone-100/80">
        <div className="flex flex-col">
          <span className="text-xs text-stone-400 font-medium">Price</span>
          <span className="text-lg font-bold text-stone-900 tabular-nums">
            ₹{item.price}
          </span>
        </div>

        {isClosedToday ? (
          <button
            type="button"
            disabled
            className="px-3 py-1.5 bg-stone-100 border border-stone-200 text-stone-400 font-semibold text-xs rounded-lg cursor-not-allowed opacity-90 whitespace-nowrap"
            title="Restaurant is closed today. We are not accepting orders today."
          >
            Closed Today
          </button>
        ) : item.is_available ? (
          quantity > 0 ? (
            <div className="flex items-center gap-2 bg-stone-900 text-white rounded-lg px-2 py-1 shadow-xs">
              <button
                onClick={() => decrementQuantity(item.id)}
                className="p-1 hover:text-amber-400 transition-colors cursor-pointer"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold px-1 tabular-nums min-w-[1.2rem] text-center">
                {quantity}
              </span>
              <button
                onClick={() => addToCart(item)}
                className="p-1 hover:text-amber-400 transition-colors cursor-pointer"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => addToCart(item)}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-bold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>Add</span>
              <Plus className="w-3.5 h-3.5" />
            </button>
          )
        ) : (
          <span className="text-xs font-semibold text-stone-400 py-1.5 px-2">
            Unavailable
          </span>
        )}
      </div>
    </article>
  );
};
