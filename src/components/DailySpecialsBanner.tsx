import React, { useState } from 'react';
import {
  Flame,
  Tag,
  Clock,
  Sparkles,
  ArrowRight,
  Plus,
  Check,
  Percent,
  Truck,
  Copy,
  BadgePercent,
  Gift,
} from 'lucide-react';
import { FoodItem } from '../types/restaurant';
import { useCart } from '../context/CartContext';
import { useRestaurantStatus } from '../context/RestaurantStatusContext';

interface DailySpecialsBannerProps {
  foodItems: FoodItem[];
  onExploreMenu: () => void;
}

export const DailySpecialsBanner: React.FC<DailySpecialsBannerProps> = ({
  foodItems,
  onExploreMenu,
}) => {
  const { addToCart, setIsCartOpen } = useCart();
  const { isClosedToday } = useRestaurantStatus();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [addedDealId, setAddedDealId] = useState<string | null>(null);

  // Curated Featured Daily Specials & Limited Combos
  const DAILY_SPECIALS = [
    {
      id: 'deal-combo-1',
      title: 'Full Meal + Andhra Chicken Combo',
      kicker: 'Today’s Lunch Special',
      badge: 'SAVE ₹30',
      badgeColor: 'bg-amber-500 text-stone-950',
      originalPrice: 240,
      offerPrice: 210,
      description: 'Authentic unlimited South Indian leaf meal accompanied by spicy homestyle country chicken curry.',
      image: '/src/assets/images/dish_south_indian_meals_1792160842617.jpg',
      targetItemId: 'item-meals-2',
      fallbackItem: {
        id: 'item-meals-2',
        name: 'Non-Veg Meal Combo with Chicken Curry',
        category_id: 'cat-meals',
        category_name: 'Full Meals',
        price: 210,
        description: 'Special South Indian leaf meal accompanied by a generous bowl of homestyle spicy Andhra chicken curry.',
        image_url: '/src/assets/images/dish_south_indian_meals_1792160842617.jpg',
        is_available: true,
        is_veg: false,
        display_order: 2,
      },
    },
    {
      id: 'deal-biryani-2',
      title: 'Double Handi Biryani Feast',
      kicker: 'Bestseller Pair Deal',
      badge: 'FLAT 15% OFF',
      badgeColor: 'bg-red-600 text-white',
      originalPrice: 440,
      offerPrice: 380,
      description: 'Two dum-cooked Hyderabadi chicken biryanis in slow-roasted whole spices, extra mirchi salan & raitha.',
      image: '/src/assets/images/dish_chicken_biryani_1792160843306.jpg',
      targetItemId: 'item-bir-chk-1',
      fallbackItem: {
        id: 'item-bir-chk-1',
        name: 'Hyderabadi Chicken Dum Biryani',
        category_id: 'cat-chicken-biryani',
        category_name: 'Chicken Biryani',
        price: 220,
        description: 'Long grain aged basmati rice cooked on dum with tender spiced chicken marinated overnight.',
        image_url: '/src/assets/images/dish_chicken_biryani_1792160843306.jpg',
        is_available: true,
        is_veg: false,
        display_order: 1,
      },
    },
    {
      id: 'deal-mutton-3',
      title: 'Military Mess Mutton Curry Special',
      kicker: 'Slow Wood-Fire Brass Handi',
      badge: 'CHEF CHOICE',
      badgeColor: 'bg-stone-900 text-amber-400 border border-amber-500/40',
      originalPrice: 280,
      offerPrice: 250,
      description: 'Tender bone-in goat cuts braised in freshly pounded Tellicherry black pepper and roasted shallot gravy.',
      image: '/src/assets/images/dish_mutton_curry_1792160843975.jpg',
      targetItemId: 'item-mut-1',
      fallbackItem: {
        id: 'item-mut-1',
        name: 'Military Mess Special Mutton Curry',
        category_id: 'cat-mutton-curry',
        category_name: 'Mutton Curry',
        price: 250,
        description: 'Tender baby goat meat cooked in thick aromatic Telangana gravy.',
        image_url: '/src/assets/images/dish_mutton_curry_1792160843975.jpg',
        is_available: true,
        is_veg: false,
        display_order: 3,
      },
    },
  ];

  const handleClaimDeal = (deal: (typeof DAILY_SPECIALS)[0]) => {
    const existing = foodItems.find((f) => f.id === deal.targetItemId);
    const itemToAdd: FoodItem = existing || deal.fallbackItem;

    addToCart(itemToAdd);
    setAddedDealId(deal.id);

    setTimeout(() => {
      setAddedDealId(null);
    }, 1800);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  return (
    <section className="relative z-20 -mt-6 sm:-mt-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Container with warm artisanal background */}
      <div className="bg-stone-900 text-stone-100 rounded-2xl border border-amber-500/30 shadow-2xl overflow-hidden backdrop-blur-md">
        
        {/* Top Announcement Bar */}
        <div className="px-5 py-3 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-stone-950 flex flex-wrap items-center justify-between gap-3 text-xs font-bold border-b border-amber-400/40">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-stone-950 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-stone-950"></span>
            </span>
            <span className="uppercase tracking-wider">🔥 Today's Special Offers & Daily Deals</span>
            <span className="hidden sm:inline font-normal opacity-90">&bull; Valid during Lunch Hours (11:00 AM – 7:00 PM)</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-stone-950/15 px-2.5 py-1 rounded-md text-[11px] font-mono">
              <Truck className="w-3.5 h-3.5" />
              <span>FREE Delivery on orders over ₹500</span>
            </div>
            <button
              onClick={onExploreMenu}
              className="text-stone-950 hover:underline flex items-center gap-1 text-[11px] font-bold cursor-pointer"
            >
              <span>Explore All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Content Body: Daily Specials Cards */}
        <div className="p-5 sm:p-6 lg:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-400 tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Chef Curated Specials & Combos</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight mt-0.5">
                Featured Daily Deals
              </h3>
            </div>
            <p className="text-xs text-stone-400 max-w-sm">
              Hand-pounded masalas, slow dum cooking & piping hot delivery straight to your doorstep.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {DAILY_SPECIALS.map((deal) => {
              const isAdded = addedDealId === deal.id;
              return (
                <div
                  key={deal.id}
                  className="group relative bg-stone-950/80 rounded-xl border border-stone-800 hover:border-amber-500/60 p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
                >
                  {/* Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md shadow-xs tracking-wider ${deal.badgeColor}`}
                    >
                      {deal.badge}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Image & Kicker */}
                    <div className="relative aspect-[16/10] rounded-lg overflow-hidden bg-stone-900 border border-stone-800/80">
                      <img
                        src={deal.image}
                        alt={deal.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent" />
                      <div className="absolute bottom-2 left-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-stone-950/90 px-2 py-0.5 rounded border border-amber-500/30">
                          {deal.kicker}
                        </span>
                      </div>
                    </div>

                    {/* Details */}
                    <div>
                      <h4 className="text-base font-serif font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                        {deal.title}
                      </h4>
                      <p className="text-xs text-stone-400 line-clamp-2 mt-1 leading-relaxed">
                        {deal.description}
                      </p>
                    </div>
                  </div>

                  {/* Pricing & CTA */}
                  <div className="pt-4 mt-3 border-t border-stone-800/80 flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-amber-400 font-mono">
                          ₹{deal.offerPrice}
                        </span>
                        <span className="text-xs text-stone-500 line-through tabular-nums">
                          ₹{deal.originalPrice}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-semibold block">
                        Inclusive of all taxes
                      </span>
                    </div>

                    {isClosedToday ? (
                      <button
                        type="button"
                        disabled
                        className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-stone-800 border border-stone-700 text-stone-500 cursor-not-allowed opacity-80"
                        title="Restaurant is closed today"
                      >
                        Closed Today
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleClaimDeal(deal)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm ${
                          isAdded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Added to Bag</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Claim Deal</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Promo Code & Free Delivery Banner Strip */}
          <div className="pt-2">
            <div className="p-3.5 bg-stone-950/90 rounded-xl border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <BadgePercent className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">
                    Use Coupon Code: <span className="text-amber-400 font-mono">SAIMESS50</span>
                  </span>
                  <span className="text-[11px] text-stone-400">
                    Get flat ₹50 instant discount on orders above ₹600. Valid today only!
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyCode('SAIMESS50')}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedCode === 'SAIMESS50' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCartOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors cursor-pointer"
                >
                  Apply in Bag
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
