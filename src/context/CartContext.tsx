import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, FoodItem } from '../types/restaurant';
import { useRestaurantStatus } from './RestaurantStatusContext';

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: FoodItem) => void;
  reorderItems: (items: Array<{ food_item_id: string; item_name: string; unit_price: number; quantity: number }>) => void;
  removeFromCart: (itemId: string) => void;
  decrementQuantity: (itemId: string) => void;
  clearCart: () => void;
  subtotal: number;
  deliveryFee: number;
  finalTotal: number;
  totalCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('sai_mess_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('sai_mess_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn('Failed to save cart to localStorage', e);
    }
  }, [cart]);

  const { isClosedToday } = useRestaurantStatus();

  const addToCart = (item: FoodItem) => {
    if (isClosedToday) {
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.food_item.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.food_item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { food_item: item, quantity: 1 }];
    });
  };

  const reorderItems = (items: Array<{ food_item_id: string; item_name: string; unit_price: number; quantity: number }>) => {
    if (isClosedToday) {
      return;
    }
    setCart((prev) => {
      let updated = [...prev];
      for (const item of items) {
        const existingIdx = updated.findIndex((i) => i.food_item.id === item.food_item_id);
        if (existingIdx !== -1) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + item.quantity,
          };
        } else {
          const fallbackFoodItem: FoodItem = {
            id: item.food_item_id,
            name: item.item_name,
            category_id: 'reorder',
            category_name: 'Main Menu',
            description: 'Sri Sathya Sai Mess Special Recipe',
            price: item.unit_price,
            image_url: '/src/assets/images/dish_south_indian_meals_1792160842617.jpg',
            is_available: true,
            is_veg: !item.item_name.toLowerCase().includes('chicken') && !item.item_name.toLowerCase().includes('mutton') && !item.item_name.toLowerCase().includes('fish'),
            display_order: 99,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          updated.push({ food_item: fallbackFoodItem, quantity: item.quantity });
        }
      }
      return updated;
    });
    setIsCartOpen(true);
  };

  const decrementQuantity = (itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.food_item.id === itemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((i) => i.food_item.id !== itemId);
      }
      return prev.map((i) =>
        i.food_item.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.food_item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.food_item.price * item.quantity, 0);
  const deliveryFee = subtotal === 0 ? 0 : subtotal >= 500 ? 0 : 30; // Free delivery above ₹500
  const finalTotal = subtotal + deliveryFee;
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        reorderItems,
        removeFromCart,
        decrementQuantity,
        clearCart,
        subtotal,
        deliveryFee,
        finalTotal,
        totalCount,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
