import React from 'react';
import { ArrowRight, Flame, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { FoodItem } from '../types/restaurant';
import { useRestaurantStatus } from '../context/RestaurantStatusContext';

interface SpecialtiesSectionProps {
  foodItems: FoodItem[];
  onOrderNow: () => void;
}

export const SpecialtiesSection: React.FC<SpecialtiesSectionProps> = ({
  foodItems,
  onOrderNow,
}) => {
  const { addToCart } = useCart();
  const { isClosedToday } = useRestaurantStatus();

  const specialties = [
    {
      title: 'Unlimited Banana Leaf Meals',
      kicker: 'Homestyle Daily Service',
      description:
        'Piping hot steamed rice, stone-ground dal with country ghee, drumstick sambar, pepper rasam, vegetable poriyal, crisp appalam, and signature spicy gongura pickle.',
      image: '/src/assets/images/dish_south_indian_meals_1792160842617.jpg',
      price: '₹150',
      tag: 'Pure Veg',
      itemId: 'item-meals-1',
    },
    {
      title: 'Hyderabadi Chicken Dum Biryani',
      kicker: 'Dum-Cooked Basmati',
      description:
        'Aged long-grain basmati infused with saffron milk, ghee, and whole spices, layered with tender marinated chicken and caramelized onions.',
      image: '/src/assets/images/dish_chicken_biryani_1792160843306.jpg',
      price: '₹220',
      tag: 'Chef Special',
      itemId: 'item-bir-chk-1',
    },
    {
      title: 'Military Mess Mutton Curry',
      kicker: 'Slow-Cooked Brass Handi',
      description:
        'Juicy baby goat meat slow-simmered in hand-roasted whole peppercorns, shallots, garlic, and fresh curry leaves.',
      image: '/src/assets/images/dish_mutton_curry_1792160843975.jpg',
      price: '₹260',
      tag: 'Bestseller',
      itemId: 'item-mut-1',
    },
    {
      title: 'Spicy Mess Boti Curry',
      kicker: 'Rustic Traditional Delicacy',
      description:
        'Cleaned tender lamb tripe slow-stewed with roasted coriander, black pepper, and green chillies in thick hearty military mess gravy.',
      image: '/src/assets/images/dish_boti_curry_1792160844478.jpg',
      price: '₹210',
      tag: 'Authentic Heritage',
      itemId: 'item-boti-1',
    },
  ];

  const handleQuickAdd = (itemId: string) => {
    const item = foodItems.find((f) => f.id === itemId);
    if (item) {
      addToCart(item);
    } else {
      onOrderNow();
    }
  };

  return (
    <section id="specialties" className="py-14 sm:py-20 bg-amber-950/[0.03] border-b border-amber-900/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 tracking-wider uppercase mb-1">
              <span>Sri Sathya Sai Mess</span>
              <span aria-hidden="true">·</span>
              <span>Signature Handi Preparations</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 tracking-tight">
              Our Mess Specialties
            </h2>
          </div>
          <button
            onClick={onOrderNow}
            className="text-xs font-bold text-amber-900 hover:text-amber-800 flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span>View Full Menu</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {specialties.map((spec, idx) => (
            <div
              key={idx}
              className="group bg-white rounded-xl overflow-hidden border border-stone-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                  <img
                    src={spec.image}
                    alt={spec.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-stone-900/80 backdrop-blur-xs text-[10px] font-bold text-amber-300">
                    {spec.tag}
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
                    {spec.kicker}
                  </span>
                  <h3 className="text-base font-bold text-stone-900 leading-snug line-clamp-1">
                    {spec.title}
                  </h3>
                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {spec.description}
                  </p>
                </div>
              </div>

              <div className="p-4 pt-0 mt-2 flex items-center justify-between border-t border-stone-100">
                <span className="text-base font-bold text-stone-900 tabular-nums">
                  {spec.price}
                </span>
                {isClosedToday ? (
                  <button
                    type="button"
                    disabled
                    className="px-3 py-1.5 bg-stone-100 text-stone-400 font-semibold text-xs rounded-lg border border-stone-200 cursor-not-allowed opacity-80"
                    title="Restaurant is closed today"
                  >
                    Closed Today
                  </button>
                ) : (
                  <button
                    onClick={() => handleQuickAdd(spec.itemId)}
                    className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Order
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
