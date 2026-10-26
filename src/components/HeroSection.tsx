import React from 'react';
import { ArrowDown, Flame, UtensilsCrossed, Clock, MapPin } from 'lucide-react';

interface HeroSectionProps {
  onExploreMenu: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onExploreMenu }) => {
  return (
    <section className="relative text-stone-100 overflow-hidden border-b border-amber-950/40 bg-stone-950">
      {/* Authentic Mess Dining Hall Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src="/src/assets/images/mess_dining_hall_background_1792208591922.jpg"
          alt="Sri Sathya Sai Mess traditional dining room with banana leaf meals"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center scale-105 filter brightness-90 contrast-105"
        />
        {/* Warm traditional mess atmospheric overlays: warm terracotta, turmeric, and wood tones - not cold black */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-950/92 via-amber-950/80 to-stone-950/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-amber-950/30 to-amber-900/40" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_60%)]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Narrative with warm mess backdrop */}
          <div className="lg:col-span-7 space-y-6 bg-stone-950/65 sm:bg-stone-950/55 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-amber-500/25 shadow-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 tracking-wider uppercase">
              <span>Military & Homestyle Mess</span>
              <span aria-hidden="true">·</span>
              <span>Est. 1998</span>
              <span aria-hidden="true">·</span>
              <span>South Indian Traditional Kitchen</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-stone-50 leading-[1.12] tracking-tight">
              Fiery Curries. Slow-Dum Biryani. <span className="text-amber-400 italic">Authentic Leaf Meals.</span>
            </h1>

            <p className="text-base sm:text-lg text-stone-200 max-w-2xl leading-relaxed font-normal">
              Sri Sathya Sai Mess brings you the unforgettable, bold taste of authentic Andhra and Telangana military messes. Hand-pounded spices, cold-pressed oils, tender goat cuts, and piping hot banana leaf meals cooked fresh every morning.
            </p>

            {/* Trust metrics - clean unboxed typography */}
            <div className="pt-2 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-amber-200/90 font-medium">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Wood-Fired Slow Gravies</span>
              </div>
              <div className="flex items-center gap-1.5">
                <UtensilsCrossed className="w-4 h-4 text-amber-400" />
                <span>Unlimited Banana Leaf Service</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Hot Delivery in 30–45 Mins</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="pt-3 flex flex-wrap items-center gap-4">
              <button
                onClick={onExploreMenu}
                className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg transition-colors flex items-center gap-2 shadow-md cursor-pointer whitespace-nowrap active:scale-95"
              >
                <span>Order Food Online</span>
                <ArrowDown className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 text-xs text-amber-200 pl-2 font-medium">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>Free delivery on orders over ₹500</span>
              </div>
            </div>
          </div>

          {/* Right Column: High-Fidelity Hero Image */}
          <div className="lg:col-span-5 relative z-10">
            <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 shadow-2xl bg-stone-900 aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3]">
              <img
                src="/src/assets/images/regenerated_image_1792566502696.png"
                alt="Sri Sathya Sai Mess authentic dining table with banana leaf meals and rich curries"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 text-xs text-stone-200 flex items-center justify-between">
                <span className="font-medium">Sri Sathya Sai Mess Dining Room</span>
                <span className="text-amber-400 font-semibold">Fresh Batches Daily</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
